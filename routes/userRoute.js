const express = require('express');
const router = express.Router();



const passportFile = require(`../services/passport`)
const passport = passportFile.passport

///GOOGLE SIGN IN
router.use(passport.initialize());
router.use(passport.session());


//RAZORPAY integration//
const razorpay = require(`../services/razorpay`)


const userController = require('../controllers/userController')
const userProfileController = require(`../controllers/userProfileController`)
const productController = require('../controllers/productController')
const cartController = require(`../controllers/cartController`)
const wishlistController = require(`../controllers/wishlistController`)
const orderController = require(`../controllers/orderController`)
const walletController = require(`../controllers/walletController`)
const couponController = require(`../controllers/couponController`)
const searchController = require(`../controllers/searchController`)

const SessionHandling = require(`../middlewares/SessionHandling`)



// Route to initiate Google authentication
router.get('/auth/google',passportFile.googleLogin);

// Route to handle the callback from Google
router.get('/auth/google/callback', passportFile.googleCallback);


//for Header Icon
router.get(`/cartDataIcon`, SessionHandling.userIsLoggedIn, cartController.cartDataIcon)
router.get(`/wishlistDataIcon`, SessionHandling.userIsLoggedIn, wishlistController.wishlistDataIcon)



// USER SIGNUP
router.route(`/login`)
  .get(SessionHandling.userIsLoggedOut, userController.loginRender)
  .post(userController.login)

router.route(`/register`)
  .get(SessionHandling.userIsLoggedOut, userController.registerRender)
  .post(userController.register)

router.route(`/forgetpassword`)
  .get(SessionHandling.userIsLoggedOut, userController.forgetPasswordRender)
  .post(userController.forgetPassword)

router.get('/resetpassword/:token', SessionHandling.userIsLoggedOut, userController.resetPasswordRender)
router.get(`/logout`, userController.userLogout)

router.post(`/emailverification`, userController.emailVerification)
router.post(`/resend-verification`, userController.resendEmailVerification)
router.post(`/resend-reset-email`, userController.resendResetEmail)
router.post(`/resetpassword`, userController.resetPassword)

//////////////////////////////////////////////////////////////////////////////////////////////////////

router.get('/', userController.homeRender)
router.get(`/home`, userController.homeRender)
router.get('/singleproduct/:id', productController.singleProductPage)

//search 
router.get('/collections', searchController.collections);

//ADD TO CART
router.get(`/cart`, SessionHandling.userIsLoggedIn, cartController.cartRender)
router.post('/cart/:productId/:variationIndex/:quantity', SessionHandling.userIsLoggedIn, cartController.addToCart)
router.delete('/cart/:productId/:variationIndex', SessionHandling.userIsLoggedIn, cartController.deleteCart)
router.get(`/addressInCart`, SessionHandling.userIsLoggedIn, cartController.getAddressInCart)

router.get('/address/:id', SessionHandling.userIsLoggedIn, cartController.renderEditForm)
router.post('/postAddressInCart', SessionHandling.userIsLoggedIn, cartController.addAddress);
router.put('/address/:id', SessionHandling.userIsLoggedIn, cartController.editAddress);
router.delete('/address/:id', SessionHandling.userIsLoggedIn, cartController.deleteAddress);
router.put('/address/default/:id', SessionHandling.userIsLoggedIn, cartController.setDefaultAddress);

router.get('/payment', SessionHandling.userIsLoggedIn, cartController.payment);
router.post(`/placeorder`, SessionHandling.userIsLoggedIn, cartController.placeOrder)
router.post(`/payment/failure`, SessionHandling.userIsLoggedIn , cartController.placeOrderFailed)
router.get(`/orderSuccess` , SessionHandling.userIsLoggedIn , cartController.orderSuccess)
router.get(`/orderFailure` , SessionHandling.userIsLoggedIn, cartController.orderFailed)

//coupon
router.post(`/cart/apply-coupon`, SessionHandling.userIsLoggedIn, couponController.applyCoupon)
router.delete(`/cart/remove-coupon`, SessionHandling.userIsLoggedIn, couponController.removeCoupon)


//WIshlist
router.get(`/wishlist`, SessionHandling.userIsLoggedIn, wishlistController.wishlistRender)
router.post(`/addtowishlist/:id/:variationIndex`, SessionHandling.userIsLoggedIn, wishlistController.addToWishlist)
router.delete(`/removeFromWishlist/:id`, SessionHandling.userIsLoggedIn, wishlistController.removeFromWishlist)


//USER PROFILE
router.get(`/profile`, SessionHandling.userIsLoggedIn, userProfileController.profileRender)
router.get(`/profileedit`, SessionHandling.userIsLoggedIn, userProfileController.profileEditRender)
router.get(`/address`, SessionHandling.userIsLoggedIn, userProfileController.addressRender)
router.get(`/setdefaultaddress/:id`, SessionHandling.userIsLoggedIn, userProfileController.setDefaultAddress)
router.get(`/deleteaddress/:id`, SessionHandling.userIsLoggedIn, userProfileController.deleteAddress)
router.get(`/addaddress`, SessionHandling.userIsLoggedIn, userProfileController.addAddressRender)
router.get(`/editaddress/:id`, SessionHandling.userIsLoggedIn, userProfileController.editAddressRender)
router.get(`/deleteuser`, SessionHandling.userIsLoggedIn, userProfileController.deleteUserRender)
router.delete(`/deleteuseraccount`, SessionHandling.userIsLoggedIn, userProfileController.deleteUser)
router.get(`/orders`, SessionHandling.userIsLoggedIn, userProfileController.userOrders)
router.get(`/orderDetails/:orderId/:itemId`, SessionHandling.userIsLoggedIn, userProfileController.userOrderDetails)
router.get(`/order-invoice/:orderId`, SessionHandling.userIsLoggedIn, userProfileController.invoice_render)
router.get(`/security`, SessionHandling.userIsLoggedIn, userProfileController.securityRender)

router.post('/cancel-order', SessionHandling.userIsLoggedIn, orderController.orderCancel)
router.post('/return-order', SessionHandling.userIsLoggedIn, orderController.orderReturn)
router.post(`/profileedit`, SessionHandling.userIsLoggedIn, userProfileController.profileEdit)
router.post(`/addaddress`, SessionHandling.userIsLoggedIn, userProfileController.addAddress)
router.post(`/editaddress/:id`, SessionHandling.userIsLoggedIn, userProfileController.editAddress)


//RAZORPAY
router.post('/payment/razorpay', SessionHandling.userIsLoggedIn, razorpay.razorpayReciept)
router.post('/payment/verify', SessionHandling.userIsLoggedIn, razorpay.razorpayVerification)

//WALLET
router.get(`/wallet`, SessionHandling.userIsLoggedIn, walletController.walletRender)
router.post(`/payment/wallet`, SessionHandling.userIsLoggedIn, walletController.walletPayment)
router.post('/wallet/create-razorpay-order', SessionHandling.userIsLoggedIn, walletController.amountDeposit)
router.post('/wallet/verify-payment', SessionHandling.userIsLoggedIn, walletController.walletPaymentVerification)


module.exports = router;
