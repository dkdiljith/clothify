
const cartService = require('../services/cartService');


//MESSAGE_CONSTANTS
const CART_MESSAGES = require(`../constants/cart`)
const STATUS_CODES = require(`../constants/status-codes`)

////////////////////////////////////////////////////////////////////////////////////////////////////////////////


exports.cartRender = async (req, res) => {
  try {
    const userId = res.locals.user._id;
    const flashMessage = res.locals.message || null;
    const cartData = await cartService.getCartForRendering(userId, flashMessage);
    return res.render('user/cart', cartData);
  } catch {
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(CART_MESSAGES.RENDER_ERROR);
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
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: CART_MESSAGES.FAILED_ITEM_ADDED });
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
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: CART_MESSAGES.CART_NOT_FOUND });
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
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: CART_MESSAGES.FAILED_TO_FETCH });
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
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(CART_MESSAGES.FAILED_PAYMENTPAGE);
  }
};