const Order = require("../models/orderSchema");
const Wallet = require(`../models/walletSchema`)
const Coupon = require(`../models/couponSchema`)


//MESSAGE_CONSTANTS
const MESSAGES = require(`../utils/constants`)

/////////////////////////////////////////////////////////////////////////////////////


//OrderId - creation
const orderIdGeneration = async () => {
  const randomNumber = crypto.randomInt(100000, 1000000);
  const orderId = `ORD-${randomNumber}`;
  const order = await Order.findOne({ orderId });

  if (order) {
    return await orderIdGeneration();
  }
  return orderId;
};


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////





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
    const { addressId, reason } = req.body;
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
  res.render('user/orderSuccess', { plain_body: true });
}

exports.orderFailed = (req, res) => {
  res.render('user/orderFailure', { plain_body: true })
}



