var Cart = require(`../models/cartSchema`);
var Product = require(`../models/productSchema`);
var Address = require(`../models/addressSchema`)
var Order = require(`../models/orderSchema`)




// Helper function to recalculate cart summary
async function recalculateCartSummary(userId) {
    const cart = await Cart.findOne({ userId }).populate('items.productId'); // Populate product details

    if (!cart) {
        return { subtotal: 0, shippingFee: 0, totalAmount: 0 };
    }

    let subtotal = 0;
    cart.items.forEach(item => {
        if (item.productId && item.productId.details[item.variationIndex]) {
            subtotal += item.productId.details[item.variationIndex].price * item.quantity;
        }
    });

    let shippingFee = subtotal >= 2000 ? 0 : subtotal > 0 ? 80 : 0;
    const totalAmount = subtotal + shippingFee;

    await Cart.updateOne({ userId }, { $set: { subtotal, shippingFee, totalAmount } });
    await cart.save();

    return { subtotal, shippingFee, totalAmount };
}


























/////////////////////////////////////////////////////////////
exports.cartRender = async (req, res) => {
    try {
        const userId = req.session.userIsLoggedIn.id;
        const cart = await Cart.findOne({ userId: userId })
            .populate('items.productId')
            .lean();

        let subtotal = 0;
        if (cart && cart.items) {
            cart.items.forEach(item => {
                if (item.productId && item.productId.details[item.variationIndex]) {
                    subtotal += item.productId.details[item.variationIndex].price * item.quantity;
                }
            });
        }

        let shippingFee;
        if (subtotal >= 2000) {
            shippingFee = 0;
        } else if (subtotal > 0 && subtotal < 2000) {
            shippingFee = 80;
        } else {
            shippingFee = 0;
        }

        const totalAmount = subtotal + shippingFee;

        await Cart.updateOne({ userId }, { $set: { subtotal, shippingFee, totalAmount } });

        res.render('user/cart', {
            cart: cart,
            subtotal,
            shippingFee,
            totalAmount,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

exports.addToCart = async (req, res) => {
    try {
        const userId = req.session.userIsLoggedIn.id;
        const productId = req.params.id;
        const variationIndex = parseInt(req.params.variationIndex);

        let cart = await Cart.findOne({ userId: userId })

        if (!cart) {
            cart = new Cart({ userId: userId, items: [] });
        }

        const existingItem = cart.items.find(item =>
            item.productId.toString() === productId && item.variationIndex === variationIndex
        )

        if (existingItem) {
            const product = await Product.findById(productId);
            const productQuantity = product.details[variationIndex].quantity;
        
            if (existingItem.quantity < 1) {
                responseData = {
                    success: false,
                    message: 'product is out of stock',
                };
            } else if (existingItem.quantity < productQuantity) {
                existingItem.quantity += 1; 
                responseData = { 
                    success: true,
                    message: 'Item quantity updated.', 
                };
            } else {
                responseData = {
                    success: false,
                    message: 'maximum stock reached',
                };
            }
        } else {
            cart.items.push({ 
                productId: productId,
                variationIndex: variationIndex,
            });
            responseData = { 
                success: true,
                message: 'Item added to cart!',
            };
        }

        await cart.save();
        return res.json(responseData); 

        res.json({
            success: true,
            message: 'Item added to cart!',
        });

    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).json({
            success: false,
            message: 'An error occurred. Please try again later.'
        });
    }
};



////////////////////////////////////////////////////////////OPERATIONS///////////////////////////////////////////////////////////////
exports.operation = async (req, res) => {
    try {
        console.log('Received Request:', req.params, req.body, req.session);
        
        const userId = req.session.userIsLoggedIn?.id; 
        if (!userId) return res.status(401).json({ success: false, message: "User not logged in" });

        const productId = req.params.productId;
        const variationIndex = parseInt(req.params.variationIndex);
        const quantityChange = req.body.quantity;

        console.log('Finding cart for user:', userId);
        const cart = await Cart.findOne({ userId });

        if (!cart) {
            console.log('Cart not found for user:', userId);
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(item =>
            item.productId.toString() === productId && item.variationIndex === variationIndex
        );

        if (itemIndex === -1) {
            console.log('Item not found in cart:', productId);
            return res.status(404).json({ success: false, message: 'Item not found in cart' });
        }

        const item = cart.items[itemIndex];
        const product = await Product.findById(productId);

        if (!product || !product.details[variationIndex]) {
            console.log('Product or variation not found:', productId);
            return res.status(404).json({ success: false, message: 'Product or variation not found' });
        }

        const availableQuantity = product.details[variationIndex].quantity;

        if (quantityChange > 0 && item.quantity + quantityChange > availableQuantity) {
            console.log('Max stock reached');
            return res.status(400).json({ success: false, message: 'Maximum stock reached' });
        }

        if (quantityChange < 0 && item.quantity + quantityChange < 1) {
            console.log('Quantity cannot be less than 1');
            return res.status(400).json({ success: false, message: 'Quantity cannot be less than 1' });
        }

        cart.items[itemIndex].quantity += quantityChange;
        await cart.save();

        const summary = await recalculateCartSummary(userId);
        console.log('Cart Updated Successfully:', summary);
        
        res.json({ success: true, ...summary });

    } catch (error) {
        console.error('Operation error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};



exports.deleteCart = async (req, res) => {
    try {
        const userId = req.session.userIsLoggedIn.id;
        const productId = req.params.productId;
        const variationIndex = parseInt(req.params.variationIndex);

        const cart = await Cart.findOne({ userId });

        console.log('Delete called:', req.params, req.session);

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        cart.items = cart.items.filter(item =>
            !(item.productId.toString() === productId && item.variationIndex === variationIndex)
        );
        await cart.save();

        const summary = await recalculateCartSummary(userId);

        console.log('Server response:', { success: true, ...summary });

        res.json({ success: true, message: 'Item removed successfully', ...summary });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};



exports.getAddressInCart = async (req, res) => {
    try {
        const userId = req.session.userIsLoggedIn.id;
        const cart = await Cart.findOne({ userId: userId }).lean();
        const address = await Address.find({ userId: userId }).lean();

        if (!userId) {  
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.render('user/addressInCheckout', { cart: cart, address: address });
    } catch (error) {
        console.error('Error fetching address page data:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.postAddressInCart =  async (req, res) => {
    try {
        const userId = req.session.userIsLoggedIn.id;
        const { name, phone, zip, streetAddress, locality, city, state } = req.body;

   
        if (!name || !phone || !zip || !streetAddress || !locality || !city || !state) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const newAddress = new Address({
            userId,
            name,
            phone,
            zip,
            streetAddress,
            locality,
            city,
            state,
            country: 'India', 
            isDefault: true,
        });

        await newAddress.save();

        

        res.json({ success: true, message: 'Address added successfully' });
    } catch (error) {
        console.error('Error adding new address:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

exports.setDefaultAddress = async (req, res) => {
    const addressId = req.params.id;
    const userId = req.session.userIsLoggedIn.id
  
    try {
   
      await Address.updateMany(
        { userId: userId },
        { $set: { isDefault: false } }
      );
  
     
      await Address.findByIdAndUpdate(
        addressId,
        { $set: { isDefault: true } },
        { new: true } 
      );
  
      const cart = await Cart.findOne({ userId: userId }).lean();
      const address = await Address.find({ userId: userId }).lean();

      if (!userId) { 
          return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.render('user/addressInCheckout', { cart: cart, address: address });

    } catch (error) {
      console.error("Error setting default address:", error);
      res.status(500).send('Server error');
    }
  };







  exports.payment = async (req, res) => {
    try {
        const userId = req.session.userIsLoggedIn.id;
        const cart = await Cart.findOne({ userId: userId }).lean();
        const address = await Address.find({ userId: userId }).lean();

        if (!userId) {  
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.render('user/paymentPage', { cart: cart, address: address });

    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).send('Server error');
    }
};





exports.placeOrder = async (req, res) => {
    try {

    const userId = req.session.userIsLoggedIn.id;
    const addressId = req.query.selectedAddressId
    const paymentMethod = req.query.selectedPayment
    
    const cart = await Cart.findOne({ userId: userId }).populate('items.productId')
    const address  = await Address.findById(addressId)
 
    
    const order = new Order({
        userId: userId,
        items: cart.items.map((item) => ({
            productId: item.productId._id, 
            productName: item.productId.name,
            productPrice:item.productId.details[item.variationIndex].price,
            productImg: item.productId.images && item.productId.images.length > 0 ? item.productId.images[0].path : null,  
            productSize:item.productId.details[item.variationIndex].size,

            variationIndex: item.variationIndex,
            quantity: item.quantity,
            status: "Pending"
        })),
            
            deliveryAddress:{
                name:address.name,
                streetAddress:address.streetAddress,
                landmark:address.landmark,
                city:address.city,
                state:address.state,
                zip:address.zip,
                country:address.country,
                phone:address.phone
            },

            paymentMethod:paymentMethod,
            paymentStatus:"Pending",
        
            subtotal: cart.subtotal,
            shippingFee: cart.shippingFee,
            totalAmount: cart.totalAmount,
      });
      await order.save();
  
      console.log(`Order schema is prepared`)

      //changes the count of product 
const productUpdates = cart.items.map(async (item) => {
    const product = item.productId; 
    const variationIndex = item.variationIndex;
    const quantityToSubtract = item.quantity;

    if (product && product.details && product.details[variationIndex]) {
        product.details[variationIndex].quantity -= quantityToSubtract;
        return product.save();
    } else {
        console.warn(`Product or variation not found for item: ${item.productId}`);
        return null;
    }
});
  
      //delete the cart
      await Cart.findByIdAndDelete(cart._id)

      res.render('user/orderSuccess',{ isAdminLogin: true }) 
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Failed to place order." });
    }
  };