
const cartService = require('../services/cartService');


//MESSAGE_CONSTANTS
// const MESSAGES = require(`../utils/constants`)


////////////////////////////////////////////////////////////////////////////////////////////////////////////////


exports.cartRender = async (req, res) => {
  try {
    const userId = res.locals.user._id;
    const flashMessage = res.locals.message || null;
    const cartData = await cartService.getCartForRendering(userId, flashMessage);
    return res.render('user/cart', cartData);
  } catch {
    return res.status(500).send('Cart Render Error');
  }
};



exports.addToCart = async (req, res) => {
  try {
    const userId = res.locals.user._id;
    const { productId, variationIndex, quantity: reqQty } = req.params;
    const changeAmount = parseInt(reqQty);
    const result = await cartService.modifyCartItem(userId, productId, variationIndex, changeAmount);
    if (!result.success) {
      return res.status(result.status).json({ success: false, message: result.message });
    }
    return res.status(result.status).json(result.data);
  } catch {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};



////////////////////////////////////////////////////////////OPERATIONS///////////////////////////////////////////////////////////////



exports.deleteCart = async (req, res) => {
  try {
    const userId = res.locals.user._id;
    const productId = req.params.productId;
    const variationIndex = req.params.variationIndex;
    const result = await cartService.deleteCartItem(userId, productId, variationIndex);
    if (!result.success) {
      return res.status(result.status).json({ success: false, message: result.message });
    }
    return res.status(result.status).json(result.data);
  } catch {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};



exports.getAddressInCart = async (req, res) => {
  try {
    const userId = res.locals.user._id;
    const result = await cartService.prepareCheckoutAddresses(userId);
    if (!result.success) {
      return res.status(result.status).json({ success: false, message: result.message });
    }
    if (result.redirect) {
      return res.redirect(result.redirect);
    }
    return res.render('user/addressInCheckout', result.data);
  } catch {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};



exports.processPaymentPage = async (req, res) => {
  try {
    const { paymentMethod, addressId } = req.body;
    const userId = res.locals.user._id;

    const cart = await cartService.getCartForPaymentValidation(userId);

    if (paymentMethod === 'cod') {
      if (cart && cart.totalAmount > 1000) {
        return res.redirect(`/user/payment?selectedAddressId=${addressId}&error=cod_limit`);
      }
    }

    if (cart && cart.totalAmount >= 25000) {
      return res.redirect(`/user/payment?selectedAddressId=${addressId}&error=payment_limit`);
    }

    return res.render("user/paymentProcessing", { method: paymentMethod, addressId });

  } catch {
    return res.status(500).send("Internal Server Error");
  }
};