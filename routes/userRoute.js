const express = require('express');
const router = express.Router();

const passportFile = require(`../config/passport`)
const passport = passportFile.passport

//passport
router.use(passport.initialize());
router.use(passport.session());

//session for user
router.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

//RAZORPAY integration//
const razorpay = require(`../services/razorpay`)

//Controllers
const userController = require('../controllers/userController')
const userProfileController = require(`../controllers/userProfileController`)
const productController = require('../controllers/productController')
const cartController = require(`../controllers/cartController`)
const wishlistController = require(`../controllers/wishlistController`)
const orderController = require(`../controllers/orderController`)
const walletController = require(`../controllers/walletController`)
const couponController = require(`../controllers/couponController`)
const searchController = require(`../controllers/searchController`)

//usetAuth (session) 
const userAuth = require(`../middlewares/auth`).userAuth

//invoice generator
const downloadInvoice = require(`../services/downloadInvoice`)

// Routes to initiate Google authentication & handle the callback from Google
router.get('/auth/google', passportFile.googleLogin);
router.get('/auth/google/callback', passportFile.googleCallback);


// USER AUTHENTICATIONS
router.route(`/login`)
  .get(userController.loginRender)
  .post(userController.login)

router.route(`/register`)
  .get(userController.registerRender)
  .post(userController.register)

router.route(`/forgetpassword`)
  .get(userController.forgetPasswordRender)
  .post(userController.forgetPassword)

router.get('/resetpassword/:token', userController.resetPasswordRender)
router.get(`/logout`, userController.userLogout)

router.post(`/emailverification`, userController.emailVerification)
router.post(`/resend-verification`, userController.resendEmailVerification)
router.post(`/resend-reset-email`, userController.resendResetEmail)
router.post(`/resetpassword`, userController.resetPassword)

//////////////////////////////////////////////////////////////////////////////////////////////////////

router.get('/', userController.homeRender)
router.get(`/home`, userController.homeRender)
router.get('/collections', searchController.collections);
router.get('/singleproduct/:id', productController.singleProductPage)

//for Header Icon
router.get(`/cartDataIcon`, userAuth, cartController.cartDataIcon)
router.get(`/wishlistDataIcon`, userAuth, wishlistController.wishlistDataIcon)

//ADD TO CART
router.get(`/cart`, userAuth, cartController.cartRender)
router.post('/cart/:productId/:variationIndex/:quantity', userAuth, cartController.addToCart)
router.delete('/cart/:productId/:variationIndex', userAuth, cartController.deleteCart)
router.get(`/addressInCart`, userAuth, cartController.getAddressInCart)

router.get('/address/:id', userAuth, cartController.renderEditForm)
router.post('/postAddressInCart', userAuth, cartController.addAddress);
router.put('/address/:id', userAuth, cartController.editAddress);
router.delete('/address/:id', userAuth, cartController.deleteAddress);
router.put('/address/default/:id', userAuth, cartController.setDefaultAddress);

router.get('/payment', userAuth, cartController.payment);
router.post(`/placeorder`, userAuth, cartController.placeOrder)
router.post(`/payment/failure`, userAuth, cartController.placeOrderFailed)
router.get(`/orderSuccess`, userAuth, cartController.orderSuccess)
router.get(`/orderFailure`, userAuth, cartController.orderFailed)

//coupon
router.post(`/cart/apply-coupon`, userAuth, couponController.applyCoupon)
router.delete(`/cart/remove-coupon`, userAuth, couponController.removeCoupon)

//WIshlist
router.get(`/wishlist`, userAuth, wishlistController.wishlistRender)
router.post(`/addtowishlist/:id/:variationIndex`, userAuth, wishlistController.addToWishlist)
router.delete(`/removeFromWishlist/:id`, userAuth, wishlistController.removeFromWishlist)

//USER PROFILE
router.get(`/profile`, userAuth, userProfileController.profileRender)
router.get(`/profileedit`, userAuth, userProfileController.profileEditRender)
router.get(`/address`, userAuth, userProfileController.addressRender)
router.get(`/setdefaultaddress/:id`, userAuth, userProfileController.setDefaultAddress)
router.get(`/deleteaddress/:id`, userAuth, userProfileController.deleteAddress)
router.get(`/addaddress`, userAuth, userProfileController.addAddressRender)
router.get(`/editaddress/:id`, userAuth, userProfileController.editAddressRender)
router.get(`/deleteuser`, userAuth, userProfileController.deleteUserRender)
router.post(`/deleteuseraccount`, userAuth, userProfileController.deleteUser)
router.get(`/orders`, userAuth, userProfileController.userOrders)
router.get(`/orderDetails/:orderId/:itemId`, userAuth, userProfileController.userOrderDetails)
router.post(`/download-invoice`, userAuth, downloadInvoice)
router.get(`/security`, userAuth, userProfileController.securityRender)

router.post('/cancel-order', userAuth, orderController.orderCancel)
router.post('/return-order', userAuth, orderController.orderReturn)
router.post(`/profileedit`, userAuth, userProfileController.profileEdit)
router.post(`/addaddress`, userAuth, userProfileController.addAddress)
router.post(`/editaddress/:id`, userAuth, userProfileController.editAddress)

//RAZORPAY
router.post('/payment/razorpay', userAuth, razorpay.razorpayReciept)
router.post('/payment/verify', userAuth, razorpay.razorpayVerification)

//WALLET
router.get(`/wallet`, userAuth, walletController.walletRender)
router.post(`/payment/wallet`, userAuth, walletController.walletPayment)
router.post('/wallet/create-razorpay-order', userAuth, walletController.amountDeposit)
router.post('/wallet/verify-payment', userAuth, walletController.walletPaymentVerification)


module.exports = router;
