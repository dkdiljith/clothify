const Cart = require(`../models/cartSchema`);
const Product = require(`../models/productSchema`);
const Address = require(`../models/addressSchema`)
const Order = require(`../models/orderSchema`)
const Wallet = require(`../models/walletSchema`)
const Coupon = require(`../models/couponSchema`)

//update cart
const recalculateCartSummary = require(`../services/recalculateCartSummary`)

//MESSAGE_CONSTANTS
const MESSAGES = require(`../utils/constants`)



////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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


/////////////////////////////////////////////////////////////
exports.cartRender = async (req, res) => {
  try {
    const userId = res.locals.user._id;

    // 1. Initial check
    const cartExists = await Cart.findOne({ userId }).lean();
    if (!cartExists || cartExists.items.length === 0) {
      return res.render('user/cart', {
        cart: null, subtotal: 0, shippingFee: 0, tax: 0, totalAmount: 0, coupons: [], appliedCoupon: null
      });
    }

    // 2. Recalculate totals
    const summary = await recalculateCartSummary(userId);

    // 3. Get fresh populated data
    const updatedCart = await Cart.findOne({ userId })
      .populate('items.productId')
      .populate('couponId')
      .lean();

    // 4. Prepare Coupons for your specific template logic
    const allCoupons = await Coupon.find({
      isActive: true,
      endDate: { $gte: new Date() }
    }).lean();

    // Convert cart.couponId to a string so {{eq this._id ../cart.couponId}} works
    const currentCouponId = updatedCart.couponId?._id
      ? updatedCart.couponId._id.toString()
      : (updatedCart.couponId ? updatedCart.couponId.toString() : null);

    // Replace the ID in the object for the template comparison
    updatedCart.couponId = currentCouponId;

    const availableCoupons = allCoupons
      .filter(coupon => {
        // Filter based on your rules
        if (summary.subtotal < coupon.minimumPurchaseAmount) return false;
        if (coupon.discountType === 'price' && summary.subtotal < coupon.discountValue) return false;
        return true;
      })
      .map(coupon => ({
        ...coupon,
        _id: coupon._id.toString() // Stringify for comparison
      }))
      .sort((a, b) => {
        // Sort: Move the one that matches currentCouponId to the top
        if (a._id === currentCouponId) return -1;
        if (b._id === currentCouponId) return 1;
        return 0;
      });

    // 5. Render using your variables
    return res.render('user/cart', {
      cart: updatedCart,
      subtotal: summary.subtotal,
      shippingFee: summary.shippingFee,
      tax: summary.tax,
      totalAmount: summary.totalAmount,
      coupons: availableCoupons,
      appliedCoupon: updatedCart.couponId // This is now a string ID for your helpers
    });

  } catch (error) {
    console.error("Cart Render Error:", error);
    return res.status(500).send('Cart Render Error');
  }
};


exports.addToCart = async (req, res) => {
  try {
    const userId = res.locals.user._id;
    const { productId, variationIndex, quantity: reqQty } = req.params;
    const changeAmount = parseInt(reqQty);
    const vIndex = parseInt(variationIndex);

    const product = await Product.findById(productId);
    if (!product || !product.details[vIndex]) {
      return res.status(404).json({ success: false, message: 'Product variation not found' });
    }

    let cart = await Cart.findOne({ userId });

    const existingItem = cart ? cart.items.find(item =>
      item.productId.toString() === productId && item.variationIndex === vIndex
    ) : null;

    // 1. Handle Decrement
    if (changeAmount < 0) {
      if (!existingItem) return res.json({ success: false, message: 'Item not found' });
      if (existingItem.quantity <= 1) return res.json({ success: false, message: 'Min quantity is 1' });

      existingItem.quantity += changeAmount;
      await cart.save();

      // checks the coupon eligibility
      await recalculateCartSummary(userId);

      return res.json({
        success: true,
        message: 'Quantity decreased',
        cartCount: cart.items.reduce((acc, item) => acc + item.quantity, 0)
      });
    }

    // 2. Handle Increment / Add New
    if (!cart) cart = new Cart({ userId, items: [] });

    const currentQtyInCart = existingItem ? existingItem.quantity : 0;
    const newTotalQty = currentQtyInCart + changeAmount;
    const productStock = product.details[vIndex].quantity;

    if (newTotalQty > 10) return res.json({ success: false, message: 'Max 10 units' });
    if (newTotalQty > productStock) return res.json({ success: false, message: `Only ${productStock} available` });

    if (existingItem) {
      existingItem.quantity = newTotalQty;
    } else {
      cart.items.push({ productId, variationIndex: vIndex, quantity: changeAmount });
    }

    await cart.save();

    // Updates subtotal and recalculates everything
    await recalculateCartSummary(userId);

    return res.json({
      success: true,
      message: existingItem ? 'Quantity updated' : 'Added to cart',
      cartCount: cart.items.reduce((acc, item) => acc + item.quantity, 0)
    });

  } catch (error) {
    console.error("Cart Update Error:", error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


////////////////////////////////////////////////////////////OPERATIONS///////////////////////////////////////////////////////////////


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
    const userId = res.locals.user._id;
    const {
      paymentMethod,
      addressId,
    } = req.body;

    const isRazorpayVerified = req.razorpayVerified === true;

    // validation
    if (!paymentMethod || !addressId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    if (paymentMethod === 'razorpay' && !isRazorpayVerified) {
      return res.status(400).json({
        success: false,
        message: "Wrong Payment Info"
      });
    }

    // fetch cart and address
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    const address = await Address.findById(addressId);

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty."
      });
    }

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found"
      });
    }

    console.log(`this is cart ${cart} and this is address ${address}`)

    // order limit
    const ORDER_LIMIT = 25000;
    if (cart.totalAmount > ORDER_LIMIT) {
      return res.json({
        success: false,
        message: `Orders above ₹${ORDER_LIMIT} are not allowed. Please reduce your cart total.`
      });
    }



    // stock checking
    for (const item of cart.items) {
      const product = item.productId;
      const variation = product.details[item.variationIndex];

      if (!variation) {
        return res.json({
          success: false,
          message: `${product.name} variation not found`
        });
      }

      if (variation.quantity < item.quantity) {
        return res.json({
          success: false,
          message: `${product.name} is out of stock`
        });
      }
    }


    // payment status
    let paymentStatus = "Pending";

    //razorpay status update
    if (paymentMethod === 'razorpay' && isRazorpayVerified) {
      paymentStatus = "Completed";
    }

    // wallet payment
    if (paymentMethod === "wallet") {
      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        return res.json({
          success: false,
          message: "Wallet not found"
        });

      }

      if (wallet.balance < cart.totalAmount) {
        return res.json({
          success: false,
          message: "Insufficient wallet balance"
        });
      }

      wallet.balance -= cart.totalAmount;
      wallet.transactions.push({
        type: "debit",
        amount: cart.totalAmount,
        description:
          `₹${cart.totalAmount} debited for order payment`
      });

      const result = await wallet.save();
      if (result) {
        paymentStatus = "Completed";
      }
    }


    // order items
    const orderItems = cart.items.map((item) => ({

      productId: item.productId._id,
      productName: item.productId.name,
      productPrice: item.productId.details[item.variationIndex].price,
      productImg: item.productId.images &&
        item.productId.images.length > 0
        ? item.productId.images[0].path
        : null,
      productSize: item.productId.details[item.variationIndex].size,
      variationIndex: item.variationIndex,
      quantity: item.quantity,
      status: "Pending"

    }));

    if (paymentMethod === 'wallet' && paymentStatus === "Pending") {
      return res.status(500).json({
        success: false,
        message: "wallet payment failed."
      });
    }



    // create order
    const order = new Order({

      orderId: await orderIdGeneration(),
      userId,
      items: orderItems,
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

      paymentMethod,
      paymentStatus,
      subtotal: cart.subtotal,
      shippingFee: cart.shippingFee,
      tax: cart.tax,
      couponId: cart.couponId,
      couponDiscount: cart.couponDiscount,
      offerDiscount: cart.offerDiscount,
      totalAmount: cart.totalAmount

    });



    // save order
    await order.save();



    // reduce stock only if: cod , wallet success
    if (
      paymentMethod === "cod" ||
      paymentStatus === "Completed"
    ) {

      await Promise.all(
        cart.items.map(async (item) => {
          const product = item.productId;
          const vIndex = item.variationIndex;

          if (
            product &&
            product.details &&
            product.details[vIndex]
          ) {
            product.details[vIndex].quantity -= item.quantity;
            await product.save();
          }
        })
      );

      // clear cart
      await Cart.findByIdAndDelete(cart._id);

    }


    return res.json({
      success: true,
      paymentStatus,
      message: "Order placed successfully"
    });



  } catch (error) {
    console.error("Order Placement Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to place order."
    });
  }
};








exports.placeOrderFailed = async (req, res) => {

  console.log("Razopray faile order is working...................................")
  try {
    const userId = res.locals.user._id;
    const { addressId, reason} = req.body;
    const paymentMethod = 'razorpay'


    console.log(`this is userId ${userId} , and this is addressId ${addressId} and this is reason ${reason}`)
    if (!paymentMethod || !addressId || !reason || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // fetch cart and address
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    const address = await Address.findById(addressId);

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty."
      });
    }

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found"
      });
    }

    console.log(`this is cart ${cart} and this is address ${address}`)

    // order limit
    const ORDER_LIMIT = 25000;
    if (cart.totalAmount > ORDER_LIMIT) {
      return res.json({
        success: false,
        message: `Orders above ₹${ORDER_LIMIT} are not allowed. Please reduce your cart total.`
      });
    }


    // stock checking
    for (const item of cart.items) {
      const product = item.productId;
      const variation = product.details[item.variationIndex];

      if (!variation) {
        return res.json({
          success: false,
          message: `${product.name} variation not found`
        });
      }

      if (variation.quantity < item.quantity) {
        return res.json({
          success: false,
          message: `${product.name} is out of stock`
        });
      }
    }


    // payment status
    let paymentStatus = "Failed";


    // order items
    const orderItems = cart.items.map((item) => ({

      productId: item.productId._id,
      productName: item.productId.name,
      productPrice: item.productId.details[item.variationIndex].price,
      productImg: item.productId.images &&
        item.productId.images.length > 0
        ? item.productId.images[0].path
        : null,
      productSize: item.productId.details[item.variationIndex].size,
      variationIndex: item.variationIndex,
      quantity: item.quantity,
      status: "Failed"

    }));


    // create order
    const order = new Order({

      orderId: await orderIdGeneration(),
      userId,
      items: orderItems,
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

      paymentMethod,
      paymentStatus,
      subtotal: cart.subtotal,
      shippingFee: cart.shippingFee,
      tax: cart.tax,
      couponId: cart.couponId,
      couponDiscount: cart.couponDiscount,
      offerDiscount: cart.offerDiscount,
      totalAmount: cart.totalAmount

    });



    // save order
    await order.save();


    return res.json({
      success: true,
      paymentStatus,
      message: "Order placed successfully"
    });



  } catch (error) {
    console.error("Order Placement Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to place order."
    });
  }
};




exports.orderSuccess = (req, res) => {
  res.render('user/orderSuccess', { isAdminLogin: true });
}

exports.orderFailed = (req, res) => {
  res.render('user/orderFailure', { isAdminLogin: true })
}