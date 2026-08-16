const Order = require("../models/orderSchema");
const Wallet = require("../models/walletSchema");
const Cart = require("../models/cartSchema");
const Address = require("../models/addressSchema");
const Product = require("../models/productSchema");
const crypto = require("crypto");

// Order ID Generation Helper
async function orderIdGeneration(session) {
    const randomNumber = crypto.randomInt(100000, 1000000);
    const orderId = `ORD-${randomNumber}`;
    
    const query = Order.findOne({ orderId });
    if (session) query.session(session);
    
    const order = await query;
    if (order) {
        return await orderIdGeneration(session);
    }
    return orderId;
}

// Item Amount Calculation Helper
async function itemAmountCalculate(order, item) {
    if (!order) {
        throw new Error("Order not found");
    }
    if (!item) {
        throw new Error("Item not found");
    }
    
    const itemSubtotal = Number(item.productPrice) * item.quantity;
    const orderSubtotal = order.items.reduce((total, currentItem) => {
        return total + Number(currentItem.productPrice) * currentItem.quantity;
    }, 0);

    const itemSharePercentage = orderSubtotal > 0 ? itemSubtotal / orderSubtotal : 0;
    const itemCouponShare = (order.couponDiscount || 0) * itemSharePercentage;
    const itemOfferShare = (order.offerDiscount || 0) * itemSharePercentage;
    const itemTaxShare = (order.tax || 0) * itemSharePercentage;
    const itemShippingShare = (order.shippingFee || 0) * itemSharePercentage;

    let refundableAmount =
        itemSubtotal -
        itemCouponShare -
        itemOfferShare +
        itemTaxShare +
        itemShippingShare;

    refundableAmount = Math.max(0, Math.round(refundableAmount));
    return refundableAmount;
}

// Fetch Payment Page Details
async function getPaymentPageDetails(userId) {
    const cart = await Cart.findOne({ userId }).lean();
    const address = await Address.find({ userId }).lean();
    const wallet = await Wallet.findOne({ userId }).lean();
    return { cart, address, wallet };
}

// Place Order Service
async function placeNewOrder(userId, body, isRazorpayVerified, session) {
    const { paymentMethod, addressId } = body;

    if (!paymentMethod || !addressId) {
        const err = new Error("Missing required fields");
        err.status = 400;
        throw err;
    }
    if (paymentMethod === "razorpay" && !isRazorpayVerified) {
        const err = new Error("Wrong Payment Info");
        err.status = 400;
        throw err;
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId").session(session);
    if (!cart || cart.items.length === 0) {
        const err = new Error("Your cart is empty.");
        err.status = 400;
        throw err;
    }

    const address = await Address.findById(addressId);
    if (!address) {
        const err = new Error("Address not found");
        err.status = 404;
        throw err;
    }

    const ORDER_LIMIT = 25000;
    if (cart.totalAmount > ORDER_LIMIT) {
        const err = new Error(`Orders above ₹${ORDER_LIMIT} are not allowed. Please reduce your cart total.`);
        err.isCustomJson = true;
        throw err;
    }

    // Stock Validation
    for (const item of cart.items) {
        const product = item.productId;
        const variation = product.details[item.variationIndex];
        if (!variation) {
            const err = new Error(`${product.name} variation not found`);
            err.isCustomJson = true;
            throw err;
        }
        if (variation.quantity < item.quantity) {
            const err = new Error(`${product.name} is out of stock`);
            err.isCustomJson = true;
            throw err;
        }
    }

    let paymentStatus = "Pending";
    if (paymentMethod === "razorpay" && isRazorpayVerified) {
        paymentStatus = "Completed";
    }

    if (paymentMethod === "wallet") {
        const wallet = await Wallet.findOne({ userId }).session(session);
        if (!wallet) {
            const err = new Error("Wallet not found");
            err.isCustomJson = true;
            throw err;
        }
        if (wallet.balance < cart.totalAmount) {
            const err = new Error("Insufficient wallet balance");
            err.isCustomJson = true;
            throw err;
        }
        wallet.balance -= cart.totalAmount;
        wallet.transactions.push({
            type: "debit",
            amount: cart.totalAmount,
            description: `₹${cart.totalAmount} debited for order payment`,
        });
        await wallet.save({ session });
        paymentStatus = "Completed";
    }

    if (paymentMethod === "wallet" && paymentStatus === "Pending") {
        const err = new Error("Wallet payment failed.");
        err.status = 500;
        throw err;
    }

    const orderItems = cart.items.map((item) => ({
        productId: item.productId._id,
        productName: item.productId.name,
        productPrice: item.productId.details[item.variationIndex].price,
        productImg: item.productId.images && item.productId.images.length > 0 ? item.productId.images[0].path : null,
        productSize: item.productId.details[item.variationIndex].size,
        variationIndex: item.variationIndex,
        quantity: item.quantity,
        status: "Pending",
    }));

    const order = new Order({
        orderId: await orderIdGeneration(session),
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
            phone: address.phone,
        },
        paymentMethod,
        paymentStatus,
        subtotal: cart.subtotal,
        shippingFee: cart.shippingFee,
        tax: cart.tax,
        couponId: cart.couponId,
        couponDiscount: cart.couponDiscount,
        offerDiscount: cart.offerDiscount,
        checkoutTotal: cart.totalAmount,
        totalAmount: cart.totalAmount,
    });

    let itemTotal = 0;
    for (const item of order.items) {
        const amount = await itemAmountCalculate(order, item);
        item.amount = amount;
        itemTotal += amount;
    }

    const variationAmount = order.totalAmount - itemTotal;
    if (variationAmount !== 0 && order.items.length > 0) {
        order.items[0].amount += variationAmount;
        if (order.items[0].amount < 0) {
            order.items[0].amount = 0;
        }
    }

    await order.save({ session });

    if (paymentMethod === "cod" || paymentStatus === "Completed") {
        for (const item of cart.items) {
            const updateResult = await Product.findOneAndUpdate(
                {
                    _id: item.productId._id,
                    [`details.${item.variationIndex}.quantity`]: { $gte: item.quantity },
                },
                {
                    $inc: { [`details.${item.variationIndex}.quantity`]: -item.quantity },
                },
                { session, new: true }
            );
            if (!updateResult) {
                throw new Error(`${item.productId.name} went out of stock while placing the order.`);
            }
        }
        await Cart.findByIdAndDelete(cart._id, { session });
    }

    return { orderId: order.orderId, paymentStatus };
}

// Place Failed Order Service
async function placeFailedOrder(userId, body) {
    const { addressId, reason, orderId } = body;
    const paymentMethod = 'razorpay';

    if (orderId) {
        const retryOrder = await Order.findOne({ orderId, userId });
        if (!retryOrder) {
            const err = new Error("Cannot Find Order");
            err.status = 400;
            throw err;
        }
        return await handleRetryFailedOrderFailedFlow(userId, orderId);
    }

    if (!addressId || !reason || !userId) {
        const err = new Error("Missing required fields");
        err.status = 400;
        throw err;
    }

    const cart = await Cart.findOne({ userId }).populate('items.productId');
    const address = await Address.findById(addressId);

    if (!cart || cart.items.length === 0) {
        const err = new Error("Your cart is empty.");
        err.status = 400;
        throw err;
    }
    if (!address) {
        const err = new Error("Address not found");
        err.status = 404;
        throw err;
    }

    const ORDER_LIMIT = 25000;
    if (cart.totalAmount > ORDER_LIMIT) {
        const err = new Error(`Orders above ₹${ORDER_LIMIT} are not allowed.`);
        err.status = 400;
        throw err;
    }

    for (const item of cart.items) {
        const product = item.productId;
        const variation = product.details[item.variationIndex];
        if (!variation) {
            const err = new Error(`${product.name} variation not found`);
            err.status = 400;
            throw err;
        }
        if (variation.quantity < item.quantity) {
            const err = new Error(`${product.name} is out of stock`);
            err.status = 400;
            throw err;
        }
    }

    const orderItems = cart.items.map((item) => ({
        productId: item.productId._id,
        productName: item.productId.name,
        productPrice: item.productId.details[item.variationIndex].price,
        productImg: item.productId.images && item.productId.images.length > 0 ? item.productId.images[0].path : null,
        productSize: item.productId.details[item.variationIndex].size,
        variationIndex: item.variationIndex,
        quantity: item.quantity,
        status: "Failed"
    }));

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
        paymentStatus: "Failed",
        subtotal: cart.subtotal,
        shippingFee: cart.shippingFee,
        tax: cart.tax,
        couponId: cart.couponId,
        couponDiscount: cart.couponDiscount,
        offerDiscount: cart.offerDiscount,
        checkoutTotal: cart.totalAmount,
        totalAmount: cart.totalAmount,
        paymentAttemptsCount: 1,
        paymentRetryExpiresAt: new Date(Date.now() + 30 * 60 * 1000)
    });

    let itemTotal = 0;
    for (const item of order.items) {
        const amount = await itemAmountCalculate(order, item);
        item.amount = amount;
        itemTotal += amount;
    }

    const variationAmount = order.totalAmount - itemTotal;
    if (variationAmount !== 0 && order.items.length > 0) {
        order.items[0].amount += variationAmount;
        if (order.items[0].amount < 0) {
            order.items[0].amount = 0;
        }
    }

    await order.save();
    await Cart.findByIdAndDelete(cart._id);

    return { orderId: order.orderId, paymentStatus: "Failed" };
}

// Retry Failed Order Payment Service
async function retryFailedOrderPayment(orderId, session) {
    if (!orderId) {
        const err = new Error("Invalid Order ID provided");
        err.status = 400;
        throw err;
    }

    const order = await Order.findOne({ orderId }).session(session);
    if (!order) {
        const err = new Error("Order not found");
        err.status = 404;
        throw err;
    }

    if (order.paymentStatus === "Completed") {
        const err = new Error("Order is already completed");
        err.status = 400;
        throw err;
    }

    order.paymentStatus = "Completed";
    order.items.forEach((item) => {
        item.status = "Pending";
    });

    await order.save({ session });

    for (const item of order.items) {
        const updatedProduct = await Product.findOneAndUpdate(
            {
                _id: item.productId,
                [`details.${item.variationIndex}.quantity`]: { $gte: item.quantity },
            },
            {
                $inc: { [`details.${item.variationIndex}.quantity`]: -item.quantity },
            },
            { session, new: true }
        );
        if (!updatedProduct) {
            throw new Error(`Insufficient stock for one or more products.`);
        }
    }

    return order.orderId;
}

// Handle Retry Failed Order Counter/Expiration Check
async function handleRetryFailedOrderFailedFlow(userId, orderId) {
    const retryOrder = await Order.findOne({ orderId, userId });
    if (!retryOrder) {
        const err = new Error("Cannot Find Order");
        err.status = 400;
        throw err;
    }

    const currentTime = new Date();
    if (retryOrder.paymentRetryExpiresAt && currentTime > retryOrder.paymentRetryExpiresAt) {
        const err = new Error("The 30-minute retry window has expired. Please create a new order.");
        err.status = 400;
        throw err;
    }

    if (retryOrder.paymentAttemptsCount >= 6) {
        const err = new Error("You have reached the maximum limit of 5 payment retries for this order.");
        err.status = 400;
        throw err;
    }

    retryOrder.paymentAttemptsCount++;
    await retryOrder.save();

    return { orderId, attempts: retryOrder.paymentAttemptsCount, isRetryFailedUpdate: true };
}

// Fetch Order Details for Success/Failure Pages
async function fetchOrderForStatusPage(orderId) {
    if (!orderId) return null;
    return await Order.findOne({ orderId }).lean();
}

module.exports = {
    getPaymentPageDetails,
    placeNewOrder,
    placeFailedOrder,
    retryFailedOrderPayment,
    fetchOrderForStatusPage
};