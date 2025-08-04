const Cart = require(`../models/cartSchema`);
const Product = require(`../models/productSchema`);
const Address = require(`../models/addressSchema`)
const Order = require(`../models/orderSchema`)
const Wallet = require(`../models/walletSchema`)
const Coupon = require(`../models/couponSchema`)



//cartdataIcon
exports.cartDataIcon = async (req, res) => {
  try {
    const userId = res.locals.user._id
    const cart = await Cart.findOne({ userId });

    if (cart) {
      const itemCount = cart.items ? cart.items.length : 0;
      return res.json({ itemCount: itemCount });
    } else {
      return res.json({ itemCount: 0 });
    }
  } catch (error) {
    console.error("Error fetching cart data for icon:", error);
    return res.status(500).json({ error: "Failed to fetch cart data" }); // Send an error response
  }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//OrderId - creation

const orderIdGeneration = async () => {
  const orderId = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  if (orderId) {
    const order = await Order.findOne({ orderId })
    if (order) {
      return await orderIdGeneration();
    } else {
      return orderId
    }
  }
}




// Helper function to recalculate cart summary
async function recalculateCartSummary(userId) {
  const cart = await Cart.findOne({ userId })
    .populate('items.productId')
    .populate('couponId');

  if (!cart) {
    return { subtotal: 0, shippingFee: 0, tax: 0, couponDiscount: 0, offerDiscount: 0, totalAmount: 0 };
  }

  //Essential fields
  let subtotal = 0
  let shippingFee = 0
  let tax = 0
  let couponDiscount = 0
  let offerDiscount = 0
  let totalAmount = 0

  // Calculate subtotal , offerDiscount and discountedPrice (productPrice - offerAmount) 
  let discountedPrice = 0

  cart.items.forEach(item => {
    let productPrice = item.productId.details[item.variationIndex].price * item.quantity;
    let offerAmount = item.productId.details[item.variationIndex].discountPrice * item.quantity;

    subtotal += productPrice
    offerDiscount += offerAmount
    discountedPrice += productPrice - offerAmount

  });

  // Coupon Finding and recalculating discountedPrice
  if (cart.couponId !== null) {
    const coupon = await Coupon.findOne({ _id: cart.couponId })
    if (coupon) {
      if (coupon.discountType == 'price') {
        couponDiscount = coupon.discountValue
        discountedPrice -= coupon.discountValue
      } else {
        let result = discountedPrice * (coupon.discountValue / 100)
        couponDiscount = result
        discountedPrice -= result
      }
    }
  }

  //Tax calculation
  const TAX_RATE = 0.06; // 6% tax
  tax = discountedPrice * TAX_RATE

  //Shipping Fee
  if ((discountedPrice + tax) >= 2000) {
    shippingFee = 0
  } else {
    shippingFee = 80
  }

  //Total Amount
  tax = Math.round(tax)
  totalAmount = discountedPrice + tax + shippingFee

  //Rounding
  totalAmount = Math.round(totalAmount)


  // Update cart with all calculated values
  await Cart.updateOne(
    { userId },
    {
      $set: {
        subtotal,
        shippingFee,
        tax,
        couponDiscount,
        offerDiscount,
        totalAmount
      }
    }
  );

  return {
    subtotal,
    shippingFee,
    tax,
    couponDiscount,
    offerDiscount,
    totalAmount
  };
}


/////////////////////////////////////////////////////////////


exports.cartRender = async (req, res) => {
  try {
    const userId = res.locals.user._id
    const cart = await Cart.findOne({ userId: userId })
      .populate('items.productId')
      .populate('couponId')
      .lean();

    if (!cart) {
      return res.render('user/cart', {
        cart: null,
        subtotal: 0,
        shippingFee: 0,
        tax: 0,
        totalAmount: 0,
        coupons: [],
        appliedCoupon: null
      });
    }

    // Recalculate cart summary using the helper function
    const {
      subtotal,
      shippingFee,
      tax,
      couponDiscount,
      totalAmount
    } = await recalculateCartSummary(userId);

    // Get all active coupons
    const coupons = await Coupon.find({
      isActive: true,
      endDate: { $gte: new Date() }
    }).lean();

    // Filter coupons based on minimum purchase using the recalculated subtotal and total amount
    const availableCoupons = coupons.filter(coupon => {
      if (totalAmount >= coupon.minimumPurchaseAmount) {
        if (coupon.discountType == 'price' && totalAmount >= coupon.discountValue) {
          return coupon
        } else if (coupon.discountType == 'percentage') {
          return coupon
        }
      }
    }
    );

    // Filter coupons based on maximum price 


    // Get the populated cart again to ensure we have fresh data
    const updatedCart = await Cart.findOne({ userId: userId })
      .populate('items.productId')
      .populate('couponId')
      .lean();

    return res.render('user/cart', {
      cart: updatedCart,
      subtotal,
      shippingFee,
      tax,
      totalAmount,
      coupons: availableCoupons,
      appliedCoupon: updatedCart.couponId || null
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Internal Server Error');
  }
};



exports.addToCart = async (req, res) => {
  try {
    const userId = res.locals.user._id
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

  } catch (error) {
    console.error("Error adding to cart:", error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again later.'
    });
  }
};



////////////////////////////////////////////////////////////OPERATIONS///////////////////////////////////////////////////////////////
exports.operation = async (req, res) => {
  try {
    const userId = res.locals.user._id
    if (!userId) return res.status(401).json({ success: false, message: "User not logged in" });

    const productId = req.params.productId;
    const variationIndex = parseInt(req.params.variationIndex);
    const quantityChange = req.body.quantity;

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item =>
      item.productId.toString() === productId && item.variationIndex === variationIndex
    );

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    const item = cart.items[itemIndex];
    const product = await Product.findById(productId);

    if (!product || !product.details[variationIndex]) {
      return res.status(404).json({ success: false, message: 'Product or variation not found' });
    }

    const availableQuantity = product.details[variationIndex].quantity;

    if (quantityChange > 0 && item.quantity + quantityChange > availableQuantity) {
      return res.status(400).json({ success: false, message: 'Maximum stock reached' });
    }

    if (quantityChange < 0 && item.quantity + quantityChange < 1) {
      return res.status(400).json({ success: false, message: 'Quantity cannot be less than 1' });
    }

    cart.items[itemIndex].quantity += quantityChange;
    await cart.save();

    const summary = await recalculateCartSummary(userId);

    return res.json({ success: true, ...summary });

  } catch (error) {
    console.error('Operation error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};



exports.deleteCart = async (req, res) => {
  try {
    const userId = res.locals.user._id
    const productId = req.params.productId;
    const variationIndex = parseInt(req.params.variationIndex);

    const cart = await Cart.findOne({ userId });



    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    cart.items = cart.items.filter(item =>
      !(item.productId.toString() === productId && item.variationIndex === variationIndex)
    );
    await cart.save();

    const summary = await recalculateCartSummary(userId);



    return res.json({ success: true, message: 'Item removed successfully', ...summary });

  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};



exports.getAddressInCart = async (req, res) => {
  try {
    const userId = res.locals.user._id
    const cart = await Cart.findOne({ userId: userId }).lean();
    const address = await Address.find({ userId: userId }).lean();

    if (!userId) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.render('user/addressInCheckout', { cart: cart, address: address });
  } catch (error) {
    console.error('Error fetching address page data:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};




exports.renderEditForm = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = res.locals.user._id

    // Get address and verify it belongs to user
    const address = await Address.findOne({ _id: addressId, userId }).lean();
    if (!address) {
      return res.status(404).render('error', { message: 'Address not found' });
    }

    // Get list of cities and states for dropdowns
    const cities = [
      "Kasaragod", "Kannur", "Wayanad", "Kozhikode", "Malappuram",
      "Palakkad", "Thrissur", "Ernakulam", "Idukki", "Kottayam",
      "Alappuzha", "Pathanamthitta", "Kollam", "Thiruvananthapuram"
    ];

    const states = ["Kerala"];
    const countries = ["India"];

    return res.render('user/editAddress', {
      address,
      cities,
      states,
      countries,
      helpers: {
        // Helper to check if option should be selected
        isSelected: function (value, selectedValue) {
          return value === selectedValue ? 'selected' : '';
        },
        // Helper to handle landmark display
        showLandmark: function (landmark) {
          return landmark || 'No landmark selected';
        }
      }
    });

  } catch (error) {
    console.error("Error rendering edit form:", error);
    return res.status(500).render('error', { message: 'Failed to load edit form' });
  }
};


// Add new address
exports.addAddress = async (req, res) => {
  try {
    const userId = res.locals.user._id
    const {
      name, phone, zip, streetAddress, landmark,
      city, state, country, isDefault
    } = req.body;

    // Validate required fields
    const requiredFields = ['name', 'phone', 'zip', 'streetAddress', 'city', 'state'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
        missingFields
      });
    }

    // Validate phone number
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be 10 digits'
      });
    }

    // Validate zip code
    if (!/^\d{6}$/.test(zip)) {
      return res.status(400).json({
        success: false,
        message: 'Zip code must be 6 digits'
      });
    }

    // If setting as default, update all other addresses
    if (isDefault) {
      await Address.updateMany(
        { userId },
        { $set: { isDefault: false } }
      );
    }

    const newAddress = new Address({
      userId,
      name,
      phone,
      zip,
      streetAddress,
      landmark: landmark || '',
      city,
      state,
      country: country || 'India',
      isDefault: isDefault || false
    });

    await newAddress.save();

    // If first address, set as default
    const addressCount = await Address.countDocuments({ userId });
    if (addressCount === 1) {
      await Address.findByIdAndUpdate(newAddress._id, { $set: { isDefault: true } });
    }

    return res.json({
      success: true,
      message: 'Address added successfully',
      address: newAddress
    });

  } catch (error) {
    console.error('Error adding address:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
},

  // Edit existing address
  exports.editAddress = async (req, res) => {
    try {
      const addressId = req.params.id;
      const userId = res.locals.user._id
      const {
        name, phone, zip, streetAddress, landmark,
        city, state, country, isDefault
      } = req.body;

      // Validate required fields
      const requiredFields = ['name', 'phone', 'zip', 'streetAddress', 'city', 'state'];
      const missingFields = requiredFields.filter(field => !req.body[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required',
          missingFields
        });
      }

      // Validate phone number
      if (!/^\d{10}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must be 10 digits'
        });
      }

      // Validate zip code
      if (!/^\d{6}$/.test(zip)) {
        return res.status(400).json({
          success: false,
          message: 'Zip code must be 6 digits'
        });
      }

      // Verify address belongs to user
      const existingAddress = await Address.findOne({ _id: addressId, userId });
      if (!existingAddress) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      // If setting as default, update all other addresses
      if (isDefault) {
        await Address.updateMany(
          { userId, _id: { $ne: addressId } },
          { $set: { isDefault: false } }
        );
      }

      const updatedAddress = await Address.findByIdAndUpdate(
        addressId,
        {
          name,
          phone,
          zip,
          streetAddress,
          landmark: landmark || '',
          city,
          state,
          country: country || 'India',
          isDefault: isDefault || false
        },
        { new: true }
      );

      return res.json({
        success: true,
        message: 'Address updated successfully',
        address: updatedAddress
      });

    } catch (error) {
      console.error('Error editing address:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // Delete address
  exports.deleteAddress = async (req, res) => {
    try {
      const addressId = req.params.id;
      const userId = res.locals.user._id

      // Verify address belongs to user
      const address = await Address.findOne({ _id: addressId, userId });
      if (!address) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      const wasDefault = address.isDefault;
      await Address.findByIdAndDelete(addressId);

      // If deleted address was default, set a new default
      if (wasDefault) {
        const remainingAddress = await Address.findOne({ userId });
        if (remainingAddress) {
          await Address.findByIdAndUpdate(
            remainingAddress._id,
            { $set: { isDefault: true } }
          );
        }
      }

      return res.json({
        success: true,
        message: 'Address deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting address:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete address'
      });
    }
  },

  // Set default address
  exports.setDefaultAddress = async (req, res) => {
    try {
      const addressId = req.params.id;
      const userId = res.locals.user._id

      // Verify address exists and belongs to user
      const address = await Address.findOne({ _id: addressId, userId });
      if (!address) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }

      // Update all addresses to not default
      await Address.updateMany(
        { userId },
        { $set: { isDefault: false } }
      );

      // Set the selected address as default
      const updatedAddress = await Address.findByIdAndUpdate(
        addressId,
        { $set: { isDefault: true } },
        { new: true }
      );

      return res.json({
        success: true,
        message: 'Default address updated',
        address: updatedAddress
      });

    } catch (error) {
      console.error("Error setting default address:", error);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }





exports.payment = async (req, res) => {
  try {
    const userId = res.locals.user._id
    const cart = await Cart.findOne({ userId }).lean();
    const address = await Address.find({ userId: userId }).lean();
    const wallet = await Wallet.findOne({ userId }).lean();

    if (!userId) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.render('user/paymentPage', { cart, address, wallet });

  } catch (error) {
    console.error('Error fetching order details:', error);
    return res.status(500).send('Server error');
  }
};





exports.placeOrder = async (req, res) => {
  try {

    const userId = res.locals.user._id
    const addressId = req.query.selectedAddressId
    const paymentMethod = req.query.selectedPayment

    const cart = await Cart.findOne({ userId: userId }).populate('items.productId')
    const address = await Address.findById(addressId)

    const order = new Order({
      orderId: await orderIdGeneration(),
      userId: userId,
      items: cart.items.map((item) => ({
        productId: item.productId._id,
        productName: item.productId.name,
        productPrice: item.productId.details[item.variationIndex].price,
        productImg: item.productId.images && item.productId.images.length > 0 ? item.productId.images[0].path : null,
        productSize: item.productId.details[item.variationIndex].size,

        variationIndex: item.variationIndex,
        quantity: item.quantity,
        status: "Pending"
      })),

      deliveryAddress: {
        name: address.name,
        streetAddress: address.streetAddress,
        landmark: address.landmark,
        city: address.city,
        state: address.state,
        zip: address.zip,
        country: address.country,
        phone: address.phone
      },

      paymentMethod: paymentMethod,
      subtotal: cart.subtotal,
      shippingFee: cart.shippingFee,
      tax: cart.tax,
      couponId: cart.couponId,
      couponDiscount: cart.couponDiscount,
      offerDiscount: cart.offerDiscount,
      totalAmount: cart.totalAmount,
    });
    await order.save();

    if (order.paymentMethod == 'razorpay' || order.paymentMethod == 'wallet') {
      order.paymentStatus = "Completed"
      order.save()
    } else {
      order.paymentStatus = "Pending"
      order.save()
    }

    //changes the count of product 
    cart.items.map(async (item) => {
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

    return res.render('user/orderSuccess', { isAdminLogin: true })
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Failed to place order." });
  }
};



