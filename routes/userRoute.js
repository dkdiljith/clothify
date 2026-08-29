import express from 'express';
const router = express.Router();

import { passport, googleLogin, googleCallback } from '../config/passport.js';

//passport
router.use(passport.initialize());
router.use(passport.session());

//session for user
router.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

//HEADER BADGES
import headerBadge from '../middlewares/headerBadge.js';
router.use(headerBadge);


//RAZORPAY integration//
import * as razorpay from '../utils/razorpay.js';

//Controllers
import * as userController from '../controllers/userController.js';
import * as userProfileController from '../controllers/userProfileController.js';
import * as productController from '../controllers/productController.js';
import * as cartController from '../controllers/cartController.js';
import * as wishlistController from '../controllers/wishlistController.js';
import * as orderController from '../controllers/orderController.js';
import * as userOrderController from '../controllers/userOrderController.js';
import * as walletController from '../controllers/walletController.js';
import * as couponController from '../controllers/couponController.js';
import * as searchController from '../controllers/searchController.js';
import * as addressController from '../controllers/addressController.js';
import * as referralController from '../controllers/referralController.js';

//usetAuth (session) 
import { userAuth } from '../middlewares/auth.js';

//product validator
import productValidator from '../middlewares/productValidator.js';

//invoice generator
import downloadInvoice from '../utils/downloadInvoice.js';


// Routes to initiate Google authentication & handle the callback from Google
router.get('/auth/google', googleLogin);
router.get('/auth/google/callback', googleCallback);


// USER AUTHENTICATIONS
router.route(`/login`)
  .get(userController.loginRender)
  .post(userController.login)

router.route(`/register`)
  .get(userController.registerRender)
  .post(userController.register)

router.route(`/emailVerification`)
  .get(userController.emailVerificationRender)
  .post(userController.emailVerification)
router.post(`/resend-email-verification`, userController.resendEmailVerification)

router.route(`/forgetPassword`)
  .get(userController.forgetPasswordRender)
  .post(userController.forgetPassword)
router.get('/resetpassword/:token', userController.resetPasswordRender)
router.post(`/resetpassword`, userController.resetPassword)

router.get(`/logout`, userController.userLogout)

//////////////////////////////////////////////////////////////////////////////////////////////////////

router.get('/', userController.homeRender)
router.get(`/home`, userController.homeRender)
router.get('/collections', searchController.collections);
router.get('/singleproduct/:id', productController.singleProductPage)


//ADD TO CART
router.get(`/cart`, userAuth, productValidator, cartController.cartRender)
router.post('/cart/:productId/:variationIndex/:quantity', userAuth, cartController.addToCart)
router.delete('/cart/:productId/:variationIndex', userAuth, cartController.deleteCart)
router.get(`/addressInCart`, userAuth, productValidator, cartController.getAddressInCart)

router.get('/address/:id', userAuth, productValidator, addressController.renderEditForm)
router.post('/address', userAuth, productValidator, addressController.addAddress);
router.put('/address/:id', userAuth, productValidator, addressController.editAddress);
router.delete('/address/:id', userAuth, productValidator, addressController.deleteAddress);

router.post("/payment/process", userAuth, productValidator, cartController.processPaymentPage);
router.get('/payment', userAuth, productValidator, userOrderController.payment);
router.post(`/placeorder`, userAuth, userOrderController.placeOrder)
router.post(`/payment/failure`, userAuth, userOrderController.placeOrderFailed)
router.get(`/orderSuccess`, userAuth, userOrderController.orderSuccess)
router.get(`/orderFailure`, userAuth, userOrderController.orderFailed)

//coupon
router.post(`/cart/apply-coupon`, userAuth, couponController.applyCoupon)
router.delete(`/cart/remove-coupon`, userAuth, couponController.removeCoupon)

//WIshlist
router.get(`/wishlist`, userAuth, wishlistController.wishlistRender)
router.post(`/addtowishlist/:id/:variationIndex`, userAuth, wishlistController.addToWishlist)
router.post(`/cart/wishlist/:productId`, userAuth, wishlistController.addToCartFromWishlist)
router.delete(`/removeFromWishlist/:id`, userAuth, wishlistController.removeFromWishlist)

//USER PROFILE
router.get(`/profile`, userAuth, userProfileController.profileRender)
router.post(`/profile/update`, userAuth, userProfileController.profileEdit)
router.post(`/profile/verify-password`, userAuth, userController.verifyPassword)
router.post(`/profile/request-email-change`, userAuth, userController.verifyEmail)
router.post(`/profile/verify-email-otp`, userAuth, userController.resetEmail)

router.get(`/address`, userAuth, userProfileController.addressRender)
router.get(`/setdefaultaddress/:id`, userAuth, userProfileController.setDefaultAddress)
router.get(`/deleteaddress/:id`, userAuth, userProfileController.deleteAddress)
router.get(`/addaddress`, userAuth, userProfileController.addAddressRender)
router.get(`/editaddress/:id`, userAuth, userProfileController.editAddressRender)
router.get(`/deleteuser`, userAuth, userProfileController.deleteUserRender)
router.post(`/deleteuseraccount`, userAuth, userProfileController.deleteUser)
router.get(`/orders`, userAuth, userProfileController.userOrders)
router.get(`/orderDetails/:orderId`, userAuth, userProfileController.userOrderDetails)
router.post(`/download-invoice`, userAuth, downloadInvoice)
router.get(`/security`, userAuth, userProfileController.securityRender)

router.route(`/referral`)
  .get(userAuth, referralController.referral)
  .post(userAuth, referralController.applyReferral)
router.post(`/referral/reedeem`, userAuth, referralController.redeemCoin)
router.post(`/referral/cancel`, userAuth, referralController.cancelReferral)

router.post('/order/cancel-item', userAuth, orderController.orderCancel)
router.post('/order/return-item', userAuth, orderController.orderReturn)
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


export default router;
