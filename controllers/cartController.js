const Cart = require(`../models/cartSchema`);
const Product = require(`../models/productSchema`);
const Address = require(`../models/addressSchema`)
const Coupon = require(`../models/couponSchema`)

//update cart
const recalculateCartSummary = require(`../services/recalculateCartSummary`)

const { verifyProductVariation } = require('../services/productHelper');

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



exports.cartRender = async (req, res) => {
  try {
    const userId = res.locals.user._id;

    // Initial check
    const cartExists = await Cart.findOne({ userId }).lean();
    if (!cartExists || cartExists.items.length === 0) {
      return res.render('user/cart', {
        cart: null, subtotal: 0, shippingFee: 0, tax: 0, totalAmount: 0, coupons: [], appliedCoupon: null
      });
    }

    //  Recalculate totals
    const summary = await recalculateCartSummary(userId);

    // Get fresh populated data
    const updatedCart = await Cart.findOne({ userId })
      .populate('items.productId')
      .populate('couponId')
      .lean();

    // Patch the null productIds with an object containing the raw ID string
    if (updatedCart && updatedCart.items && cartExists && cartExists.items) {
      updatedCart.items.forEach((item, index) => {
        if (item.productId === null) {
          const originalItem = cartExists.items[index];
          if (originalItem && originalItem.productId) {
            // Format it as an object with an _id property to match population layout
            item.productId = {
              _id: originalItem.productId.toString()
            };
            // Add a flag so your frontend template can detect it is inactive/disabled
            item.isInactiveProduct = true;
          }
        }
      });
    }


    // Prepare Coupons for your specific template logic
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
        if (summary.subtotal < coupon.minimumPurchaseAmount) return false;
        if (coupon.discountType === 'price' && summary.subtotal < coupon.discountValue) return false;
        return true;
      })
      .map(coupon => ({
        ...coupon,
        _id: coupon._id.toString()
      }))
      .sort((a, b) => {
        if (a._id === currentCouponId) return -1;
        if (b._id === currentCouponId) return 1;
        return 0;
      });

    //  Render using your variables
    return res.render('user/cart', {
      cart: updatedCart,
      subtotal: summary.subtotal,
      shippingFee: summary.shippingFee,
      tax: summary.tax,
      totalAmount: summary.totalAmount,
      coupons: availableCoupons,
      appliedCoupon: updatedCart.couponId,
      message: res.locals.message || null
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

    // Validate the product and its specific variation using your helper
    const check = await verifyProductVariation(productId, vIndex);
    if (!check.isValid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    let cart = await Cart.findOne({ userId });
    const existingItem = cart ? cart.items.find(item =>
      item.productId.toString() === productId && item.variationIndex === vIndex
    ) : null;

    // HANDLE QUANTITY DECREMENT (changeAmount is negative, e.g., -1)
    if (changeAmount < 0) {
      if (!existingItem) {
        return res.status(404).json({ success: false, message: 'Item not found in cart' });
      }
      if (existingItem.quantity <= 1) {
        return res.status(400).json({ success: false, message: 'Minimum quantity is 1' });
      }

      existingItem.quantity += changeAmount; // Decreases the quantity safely
      await cart.save();

      // Recalculate all totals/coupons natively across database models
      await recalculateCartSummary(userId);

      // FIX: Fetch fresh calculations after summary script processing completes
      const updatedCart = await Cart.findOne({ userId });
      const currentUnitProductPrice = parseFloat(check.variation.price || 0);

      return res.status(200).json({
        success: false,
        info: true,
        message: 'Quantity decreased',
        newQuantity: existingItem.quantity,
        itemTotal: existingItem.quantity * currentUnitProductPrice,
        cartSubtotal: updatedCart.subtotal,
        cartTotalItems: updatedCart.items.reduce((acc, item) => acc + item.quantity, 0),
        shippingFee: updatedCart.shippingFee,
        tax: updatedCart.tax,
        couponDiscount: updatedCart.couponDiscount,
        offerDiscount: updatedCart.offerDiscount,
        totalAmount: updatedCart.totalAmount
      });
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
      return res.status(400).json({ success: false, message: 'Maximum limit of 10 units reached' });
    }
    if (newTotalQty > productStock) {
      return res.status(400).json({ success: false, message: `Only ${productStock} units available in stock` });
    }

    if (existingItem) {
      existingItem.quantity = newTotalQty;
    } else {
      cart.items.push({ productId, variationIndex: vIndex, quantity: changeAmount });
    }
    await cart.save();

    // Updates subtotal and recalculates everything inside the helper script
    await recalculateCartSummary(userId);

    // FIX: Fetch fresh calculations after summary script processing completes
    const updatedCart = await Cart.findOne({ userId });
    const currentUnitProductPrice = parseFloat(check.variation.price || 0);
    const postSavedTargetItem = updatedCart.items.find(item =>
      item.productId.toString() === productId && item.variationIndex === vIndex
    );

    return res.status(200).json({
      // Conditional logic for your flags
      success: existingItem ? false : true,
      info: existingItem ? true : undefined, // Omitted from JSON if false, or set to existingItem ? true : false
      message: existingItem ? 'Quantity updated' : `Added ${check.product.name} to cart`,

      newQuantity: postSavedTargetItem ? postSavedTargetItem.quantity : newTotalQty,
      itemTotal: (postSavedTargetItem ? postSavedTargetItem.quantity : newTotalQty) * currentUnitProductPrice,
      cartSubtotal: updatedCart.subtotal,
      cartTotalItems: updatedCart.items.reduce((acc, item) => acc + item.quantity, 0),
      shippingFee: updatedCart.shippingFee,
      tax: updatedCart.tax,
      couponDiscount: updatedCart.couponDiscount,
      offerDiscount: updatedCart.offerDiscount,
      totalAmount: updatedCart.totalAmount
    });


  } catch (error) {
    console.error("Cart Update Error:", error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};




////////////////////////////////////////////////////////////OPERATIONS///////////////////////////////////////////////////////////////




exports.deleteCart = async (req, res) => {
  try {
    const userId = res.locals.user._id;
    const productId = req.params.productId;
    const variationIndex = parseInt(req.params.variationIndex);

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    // Filter out the item matching both product ID and variation index
    cart.items = cart.items.filter(item =>
      !(item.productId.toString() === productId && item.variationIndex === variationIndex)
    );

    await cart.save();

    // Recalculates subtotals, shipping, and discount rules internally
    await recalculateCartSummary(userId);

    // Fetch the updated document from the database to grab fresh calculation states
    const updatedCart = await Cart.findOne({ userId });

    // Return the explicit key naming conventions expected by your cart.js
    return res.json({
      success: true,
      message: 'Item removed successfully',
      cartSubtotal: updatedCart.subtotal,
      cartTotalItems: updatedCart.items.reduce((acc, item) => acc + item.quantity, 0),
      shippingFee: updatedCart.shippingFee,
      tax: updatedCart.tax,
      couponDiscount: updatedCart.couponDiscount,
      offerDiscount: updatedCart.offerDiscount,
      totalAmount: updatedCart.totalAmount
    });

  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};




exports.getAddressInCart = async (req, res) => {
  try {
    const userId = res.locals.user._id;

    if (!userId) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Fetch the user's initial cart data
    const cartData = await Cart.findOne({ userId: userId });
    const address = await Address.find({ userId: userId }).lean();

    // If no cart exists or it's empty, redirect them or render empty state
    if (!cartData || cartData.items.length === 0) {
      return res.redirect('user/cart');
    }

    //  --- INTEGRATION: Loop and check every item in the cart array ---
    const validItems = [];
    const invalidProductIds = [];

    for (const item of cartData.items) {
      const check = await verifyProductVariation(item.productId, item.variationIndex);

      if (check.isValid) {
        // Optional: Check if the product has run out of stock since they added it
        if (check.variation.quantity < item.quantity) {
          // If stock is low but not 0, you could cap it at max available stock:
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
      // Pull invalid items out of the database array
      await Cart.updateOne(
        { userId },
        { $pull: { items: { productId: { $in: invalidProductIds } } } }
      );

      // Save any altered quantities (from our stock check adjustments)
      if (validItems.length > 0) {
        cartData.items = validItems;
        await cartData.save();
      }

      // Important: Recalculate your subtotal, tax, coupons, etc., since items were removed
      await recalculateCartSummary(userId);

      // If no valid items are left at all, bounce them out of checkout back to the cart
      if (validItems.length === 0) {
        return res.redirect('/user/cart');
      }
    }

    // Fetch the fresh, clean, and fully populated cart data for the view
    const finalizedCart = await Cart.findOne({ userId: userId })
      .populate('items.productId')
      .lean();

    return res.render('user/addressInCheckout', {
      cart: finalizedCart,
      address: address
    });

  } catch (error) {
    console.error('Error fetching address page data:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};






exports.processPaymentPage = async (req, res) => {
    try {
        const { paymentMethod, addressId } = req.body;

        if (paymentMethod === 'cod') {
            const userId = res.locals.user._id;
            const cart = await Cart.findOne({ userId }).lean();

            if (cart && cart.totalAmount > 1000) {
                console.log(`COD limit exceeded by user ${userId}`);
                
                return res.redirect(`/user/payment?selectedAddressId=${addressId}&error=cod_limit`);
            }
        }

        return res.render("user/paymentProcessing", { method: paymentMethod, addressId });

    } catch (error) {
        console.error("Error in processPaymentPage:", error);
        return res.status(500).send("Internal Server Error");
    }
};
