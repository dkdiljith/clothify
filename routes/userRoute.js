var express = require('express');
var router = express.Router();


var userController = require('../controllers/userController')
var productController = require('../controllers/productController')
var SessionHandling = require("../middlewares/SessionHandling")
var passport = require(`../middlewares/passport`)


//GET methods USER
router.get('/',SessionHandling.userIsLoggedOut ,userController.indexRender)
router.get(`/login`,SessionHandling.userIsLoggedOut , userController.loginRender)
router.get(`/register`,SessionHandling.userIsLoggedOut ,userController.registerRender)
router.get(`/forgetpassword`,SessionHandling.userIsLoggedOut , userController.forgetPasswordRender)
router.get(`/logout` , userController.userLogout)
router.get(`/search` ,userController.searchProducts )
router.get(`/home`,SessionHandling.userIsLoggedOut,userController.homeRender )
router.get(`/mens`,SessionHandling.userIsLoggedIn,userController.mensRender)
router.get(`/womens`,SessionHandling.userIsLoggedIn,userController.womensRender)
router.get('/singleproduct/:id', SessionHandling.userIsLoggedIn ,productController.singleProductPage )



//POST methods USER
router.post(`/register` ,userController.register)
router.post(`/login`, userController.login)
router.post(`/emailverification` , userController.emailVerification )



///GOOGLE SIGN IN
router.use(passport.initialize());
router.use(passport.session());


// Route to initiate Google authentication
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email' ] }));

// Route to handle the callback from Google
router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect to home or dashboard.
    req.session.userIsLoggedIn = true
    res.redirect('/user/home');
  }
);



module.exports = router;
