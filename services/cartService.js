const Cart = require(`../models/cartSchema`);
const Address = require(`../models/addressSchema`);
const Coupon = require(`../models/couponSchema`);


//update cart
const recalculateCartSummary = require(`../utils/recalculateCartSummary`);
const { verifyProductVariation } = require("../utils/productHelper");


//MESSAGE_CONSTANTS
const CART_MESSAGES = require(`../constants/cart`)
const USER_MESSAGE = require(`../constants/auth`)
const STATUS_CODES = require(`../constants/status-codes`)


////////////////////////////////////////////////////////////////////////////////////////////////////////////////


exports.getCartForRendering = async (userId, flashMessage) => {
    // Initial check
    const cartExists = await Cart.findOne({ userId }).lean();
    if (!cartExists || cartExists.items.length === 0) {
        return {
            cart: null,
            subtotal: 0,
            shippingFee: 0,
            tax: 0,
            totalAmount: 0,
            coupons: [],
            appliedCoupon: null,
            message: flashMessage || null,
        };
    }
    // Recalculate totals
    const summary = await recalculateCartSummary(userId);
    // Get fresh populated data
    const updatedCart = await Cart.findOne({ userId })
        .populate("items.productId")
        .populate("couponId")
        .lean();
    // Patch the null productIds with an object containing the raw ID string
    if (updatedCart && updatedCart.items && cartExists && cartExists.items) {
        updatedCart.items.forEach((item, index) => {
            if (item.productId === null) {
                const originalItem = cartExists.items[index];
                if (originalItem && originalItem.productId) {
                    item.productId = {
                        _id: originalItem.productId.toString(),
                    };
                    item.isInactiveProduct = true;
                }
            }
        });
    }
    // Prepare Coupons for your specific template logic
    const allCoupons = await Coupon.find({
        isActive: true,
        endDate: { $gte: new Date() },
    }).lean();
    // Convert cart.couponId to a string so {{eq this._id ../cart.couponId}} works
    const currentCouponId = updatedCart.couponId?._id
        ? updatedCart.couponId._id.toString()
        : updatedCart.couponId
            ? updatedCart.couponId.toString()
            : null;
    // Replace the ID in the object for the template comparison
    updatedCart.couponId = currentCouponId;
    const availableCoupons = allCoupons
        .filter((coupon) => {
            if (summary.subtotal < coupon.minimumPurchaseAmount) return false;
            if (summary.subtotal > coupon.maximumPurchaseAmount) return false;
            if (
                coupon.discountType === "price" &&
                summary.subtotal < coupon.discountValue
            )
                return false;
            return true;
        })
        .map((coupon) => ({
            ...coupon,
            _id: coupon._id.toString(),
        }))
        .sort((a, b) => {
            if (a._id === currentCouponId) return -1;
            if (b._id === currentCouponId) return 1;
            return 0;
        });
    return {
        cart: updatedCart,
        subtotal: summary.subtotal,
        shippingFee: summary.shippingFee,
        tax: summary.tax,
        totalAmount: summary.totalAmount,
        coupons: availableCoupons,
        appliedCoupon: updatedCart.couponId,
        message: flashMessage || null,
    };
};





exports.modifyCartItem = async (
    userId,
    productId,
    variationIndex,
    changeAmount,
) => {
    const vIndex = parseInt(variationIndex);
    // Validate the product and its specific variation using your helper
    const check = await verifyProductVariation(productId, vIndex);
    if (!check.isValid) {
        return { success: false, status: STATUS_CODES.BAD_REQUEST, message: check.message };
    }
    let cart = await Cart.findOne({ userId });
    const existingItem = cart
        ? cart.items.find(
            (item) =>
                item.productId.toString() === productId &&
                item.variationIndex === vIndex,
        )
        : null;
    // HANDLE QUANTITY DECREMENT (changeAmount is negative, e.g., -1)
    if (changeAmount < 0) {
        if (!existingItem) {
            return { success: false, status: STATUS_CODES.NOT_FOUND, message: CART_MESSAGES.ITEM_NOT_FOUND };
        }
        if (existingItem.quantity <= 1) {
            return { success: false, status: STATUS_CODES.BAD_REQUEST, message:CART_MESSAGES.MIN_QUANTITY };
        }
        existingItem.quantity += changeAmount; // Decreases the quantity safely
        await cart.save();
        // Recalculate all totals/coupons natively across database models
        await recalculateCartSummary(userId);
        const updatedCart = await Cart.findOne({ userId });
        const currentUnitProductPrice = parseFloat(check.variation.price || 0);
        return {
            success: true,
            status: STATUS_CODES.OK,
            data: {
                success: false,
                info: true,
                message:CART_MESSAGES.QUANTITY_DECREASED,
                newQuantity: existingItem.quantity,
                itemTotal: existingItem.quantity * currentUnitProductPrice,
                cartSubtotal: updatedCart.subtotal,
                cartTotalItems: updatedCart.items.reduce(
                    (acc, item) => acc + item.quantity,
                    0,
                ),
                shippingFee: updatedCart.shippingFee,
                tax: updatedCart.tax,
                couponDiscount: updatedCart.couponDiscount,
                offerDiscount: updatedCart.offerDiscount,
                totalAmount: updatedCart.totalAmount,
            },
        };
    }
    // HANDLE QUANTITY INCREMENT / ADD NEW (changeAmount is positive)
    if (!cart) {
        cart = new Cart({ userId, items: [] });
    }
    const currentQtyInCart = existingItem ? existingItem.quantity : 0;
    const newTotalQty = currentQtyInCart + changeAmount;
    const productStock = check.variation.quantity;
    // Business Logic Limits
    if (newTotalQty > 10) {
        return {
            success: false,
            status: STATUS_CODES.BAD_REQUEST,
            message: CART_MESSAGES.MAX_QUANTITY,
        };
    }
    if (newTotalQty > productStock) {
        return {
            success: false,
            status: STATUS_CODES.BAD_REQUEST,
            message:CART_MESSAGES.ONLY_AVAILABLE(productStock),
        };
    }
    if (existingItem) {
        existingItem.quantity = newTotalQty;
    } else {
        cart.items.push({
            productId,
            variationIndex: vIndex,
            quantity: changeAmount,
        });
    }
    await cart.save();
    // Updates subtotal and recalculates everything inside the helper script
    await recalculateCartSummary(userId);
    const updatedCart = await Cart.findOne({ userId });
    const currentUnitProductPrice = parseFloat(check.variation.price || 0);
    const postSavedTargetItem = updatedCart.items.find(
        (item) =>
            item.productId.toString() === productId && item.variationIndex === vIndex,
    );
    return {
        success: true,
        status: STATUS_CODES.OK,
        data: {
            success: existingItem ? false : true,
            info: existingItem ? true : undefined,
            message: existingItem ? CART_MESSAGES.QUANTITY_UPDATED : CART_MESSAGES.ITEM_ADDED,
            newQuantity: postSavedTargetItem
                ? postSavedTargetItem.quantity
                : newTotalQty,
            itemTotal:
                (postSavedTargetItem ? postSavedTargetItem.quantity : newTotalQty) *
                currentUnitProductPrice,
            cartSubtotal: updatedCart.subtotal,
            cartTotalItems: updatedCart.items.reduce(
                (acc, item) => acc + item.quantity,
                0,
            ),
            shippingFee: updatedCart.shippingFee,
            tax: updatedCart.tax,
            couponDiscount: updatedCart.couponDiscount,
            offerDiscount: updatedCart.offerDiscount,
            totalAmount: updatedCart.totalAmount,
        },
    };
};





exports.deleteCartItem = async (userId, productId, variationIndex) => {
    const vIndex = parseInt(variationIndex);
    const cart = await Cart.findOne({ userId });
    if (!cart) {
        return { success: false, status: STATUS_CODES.NOT_FOUND, message: CART_MESSAGES.CART_NOT_FOUND};
    }
    // Filter out the item matching both product ID and variation index
    cart.items = cart.items.filter(
        (item) =>
            !(
                item.productId.toString() === productId &&
                item.variationIndex === vIndex
            ),
    );
    await cart.save();
    // Recalculates subtotals, shipping, and discount rules internally
    await recalculateCartSummary(userId);
    // Fetch the updated document from the database to grab fresh calculation states
    const updatedCart = await Cart.findOne({ userId });
    return {
        success: true,
        status: STATUS_CODES.OK,
        data: {
            success: true,
            message: CART_MESSAGES.ITEM_REMOVED,
            cartSubtotal: updatedCart.subtotal,
            cartTotalItems: updatedCart.items.reduce(
                (acc, item) => acc + item.quantity,
                0,
            ),
            shippingFee: updatedCart.shippingFee,
            tax: updatedCart.tax,
            couponDiscount: updatedCart.couponDiscount,
            offerDiscount: updatedCart.offerDiscount,
            totalAmount: updatedCart.totalAmount,
        },
    };
};





exports.prepareCheckoutAddresses = async (userId) => {
    if (!userId) {
        return { success: false, status: STATUS_CODES.NOT_FOUND, message: USER_MESSAGE.USER_NOT_FOUND };
    }
    // Fetch the user's initial cart data
    const cartData = await Cart.findOne({ userId: userId });
    const address = await Address.find({ userId: userId }).lean();
    // If no cart exists or it's empty
    if (!cartData || cartData.items.length === 0) {
        return { success: true, redirect: "user/cart" };
    }
    // --- INTEGRATION: Loop and check every item in the cart array ---
    const validItems = [];
    const invalidProductIds = [];
    for (const item of cartData.items) {
        const check = await verifyProductVariation(
            item.productId,
            item.variationIndex,
        );
        if (check.isValid) {
            if (check.variation.quantity < item.quantity) {
                if (check.variation.quantity > 0) {
                    item.quantity = check.variation.quantity;
                    validItems.push(item);
                } else {
                    invalidProductIds.push(item.productId);
                }
            } else {
                validItems.push(item);
            }
        } else {
            invalidProductIds.push(item.productId);
        }
    }
    // Handle database cleanup if invalid items were detected
    if (invalidProductIds.length > 0) {
        await Cart.updateOne(
            { userId },
            { $pull: { items: { productId: { $in: invalidProductIds } } } },
        );
        if (validItems.length > 0) {
            cartData.items = validItems;
            await cartData.save();
        }
        await recalculateCartSummary(userId);
        if (validItems.length === 0) {
            return { success: true, redirect: "/user/cart" };
        }
    }
    // Fetch the fresh, clean, and fully populated cart data for the view
    const finalizedCart = await Cart.findOne({ userId: userId })
        .populate("items.productId")
        .lean();
    return {
        success: true,
        status: STATUS_CODES.OK,
        data: {
            cart: finalizedCart,
            address: address,
        },
    };
};






exports.getCartForPaymentValidation = async (userId) => {
  const cart = await Cart.findOne({ userId }).lean();
  return cart;
};