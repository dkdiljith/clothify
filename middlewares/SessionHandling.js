const ErrorMessage = require(`../middlewares/ErrorMessage`);
const Product = require('../models/productSchema')
const User = require("../models/userSchema");

//=======================================================================================================
//USER SESSION MANAGEMENT

exports.userIsLoggedIn = async (req, res, next) => {
  try {
    res.locals.user = req.session.userIsLoggedIn;
    if (req.session.userIsLoggedIn) {
      const user = await User.findOne({_id:req.session.userIsLoggedIn.id}).lean()
      if (!user) {
        console.error("❌ User not found in database");
        return res.redirect("/user/login"); // Redirect if user not found
      }
      if (user.blocked) {
        //  Check user.blocked correctly
        return ErrorMessage.userBlockedError(req, res);
      }

      next();
    } else {
      res.render("user/login", { isAdminLogin: true }); // Redirect to login if session is missing
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.userIsLoggedOut = async (req, res, next) => {
  try {
    res.locals.user = req.session.userIsLoggedIn;
    if (req.session.userIsLoggedIn) {
      const user = await User.findOne({_id:req.session.userIsLoggedIn.id}).lean()
      if (!user) {
        console.error("❌ User not found in database");
        return res.redirect("/user/login"); // Redirect if user not found
      }
      if (user.blocked) {
        //  Check user.blocked correctly
        return ErrorMessage.userBlockedError(req, res);
      }

      const product = await Product.find().lean()
  res.render(`user/home` ,{
    product:product
  })
    } else {
      next(); // User is not logged in, proceed to the next middleware
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//=======================================================================================================
//ADMIN SESSION MANAGEMENT

exports.adminIsLoggedIn = async (req, res, next) => {
  try {
    if (req.session.adminIsLoggedIn) {

    next();
    } else {
      res.render('admin/login' ,{ isAdminLogin: true }); 
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.adminIsLoggedOut = async (req, res, next) => {
  try {
    if (req.session.adminIsLoggedIn) {
      res.render('admin/dashboard' , { admin: true });

      } else {
    next(); 
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
