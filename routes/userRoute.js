var express = require('express');
var router = express.Router();


var userController = require('../controllers/userController')
var productController = require('../controllers/productController')
var cartController = require(`../controllers/cartController`)
var SessionHandling = require("../middlewares/SessionHandling")
var passport = require(`../middlewares/passport`)


//GET methods USER
router.get('/',SessionHandling.userIsLoggedOut ,userController.indexRender)
router.get(`/login`,SessionHandling.userIsLoggedOut , userController.loginRender)
router.get(`/register`,SessionHandling.userIsLoggedOut ,userController.registerRender)
router.get(`/forgetpassword`,SessionHandling.userIsLoggedOut , userController.forgetPasswordRender)
router.get(`/logout` , userController.userLogout)

router.get(`/home`,SessionHandling.userIsLoggedOut,userController.homeRender )
router.get(`/mens`,SessionHandling.userIsLoggedIn,userController.mensRender)
router.get(`/womens`,SessionHandling.userIsLoggedIn,userController.womensRender)
router.get('/singleproduct/:id', SessionHandling.userIsLoggedIn ,productController.singleProductPage )

//addtocart
router.post(`/addtocart/:id/:variationIndex`,SessionHandling.userIsLoggedIn ,cartController.addToCart)
router.get(`/cart` , SessionHandling.userIsLoggedIn,cartController.cartRender)
router.delete('/cart/:productId/:variationIndex',SessionHandling.userIsLoggedIn , cartController.deleteCart)
router.post('/cart/:productId/:variationIndex/quantity', SessionHandling.userIsLoggedIn, cartController.operation)
router.get(`/addressInCart` , SessionHandling.userIsLoggedIn , cartController.getAddressInCart)
router.post(`/postAddressIncart` , SessionHandling.userIsLoggedIn , cartController.postAddressInCart)
router.post('/address/set-default/:id', SessionHandling.userIsLoggedIn,cartController.setDefaultAddress)

router.get('/payment',SessionHandling.userIsLoggedIn,cartController.payment);
router.get(`/placeorder` , SessionHandling.userIsLoggedIn , cartController.placeOrder)





//profi;e
router.get(`/profile` , SessionHandling.userIsLoggedIn, userController.profileRender)
router.get(`/profileedit` , SessionHandling.userIsLoggedIn,userController.profileEditRender)
router.get(`/address` , SessionHandling.userIsLoggedIn, userController.addressRender)
router.get(`/setdefaultaddress/:id` , SessionHandling.userIsLoggedIn ,userController.setDefaultAddress)
router.get(`/deleteaddress/:id` ,SessionHandling.userIsLoggedIn , userController.deleteAddress)
router.get(`/addaddress` , SessionHandling.userIsLoggedIn , userController.addAddressRender)
router.get(`/editaddress/:id`, SessionHandling.userIsLoggedIn,userController.editAddressRender)
router.get(`/deleteuser` , SessionHandling.userIsLoggedIn , userController.deleteUserRender)
router.get(`/deleteuseraccount` , SessionHandling.userIsLoggedIn , userController.deleteUser )
router.get(`/Orders` , SessionHandling.userIsLoggedIn, userController.userOrders)
router.get(`/orderDetails/:orderId/:itemId` , SessionHandling.userIsLoggedIn , userController.userOrderDetails)



//POST methods USER
router.post(`/register` ,userController.register)
router.post(`/login`, userController.login)
router.post(`/emailverification` , userController.emailVerification  )
router.post(`/profileedit` , SessionHandling.userIsLoggedIn, userController.profileEdit)
router.post(`/addaddress` , userController.addAddress)
router.post(`/editaddress/:id` , userController.editAddress)




///GOOGLE SIGN IN
router.use(passport.initialize());
router.use(passport.session());


// Route to initiate Google authentication
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email' ] }));

// Route to handle the callback from Google
router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/user/home');
  }
);



module.exports = router;
