const ErrorMessage = require(`../middlewares/ErrorMessage`);
const Product = require('../models/productSchema')
const User = require("../models/userSchema");
const Admin = require(`../models/adminSchema`)

//=======================================================================================================
//USER SESSION MANAGEMENT

exports.userIsLoggedIn = async (req, res, next) => {
  try {

    if (req.session.user) {
      const user = await User.findOne({_id:req.session.user._id}).lean()
      if (!user) {
        console.error("❌ User not found in database");
        req.session.destroy()
      }
      if (user.blocked) {
        //  Check user.blocked correctly
        return ErrorMessage.userBlockedError(req, res);
      }

      res.locals.user = {
        _id:user._id ,
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
    
    if (req.session.user) {
      const user = await User.findOne({_id:req.session.user._id}).lean()
      if (!user) {
        console.error("❌ User not found in database");
        req.session.destroy()
      }
      if (user.blocked) {
        //  Check user.blocked correctly
        return ErrorMessage.userBlockedError(req, res);
      }

      res.locals.user = {
        _id:user._id ,
      }

      const product = await Product.find().lean()

      if(product){
        for(let i = 0 ; i < product.length/2 ; i ++){
          let temp = product[i]
          product[i] = product[product.length - 1 - i]
          product[product.length - 1 - i] = temp
        }
      }
    
      let product8 = []
    
      if(product){
        for(let i = 0 ; i < 8 ; i ++){
          product8[i] = product[i]
        }
      }

  res.render(`user/home` ,{
    product:product8
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
    if (req.session.admin) {

      const admin = await Admin.findOne({_id:req.session.admin._id}).lean()

      if (!admin) {
        console.error("❌ Admin not found in database");
        req.session.destroy()
      }
     
      res.locals.admin = {
        _id:admin._id ,
      }

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
    if (req.session.admin) {

       const admin = await Admin.findOne({_id:req.session.admin._id}).lean()
      
      if (!admin) {
        console.error("❌ Admin not found in database");
        req.session.destroy()
      }
     
      res.locals.admin = {
        _id:admin._id ,
      }

      res.render('admin/dashboard' , { admin: true });

      } else {
    next(); 
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
