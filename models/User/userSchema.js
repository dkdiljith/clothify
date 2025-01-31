const mongoose = require("mongoose");
const { emailVerification } = require("../../controllers/userController");
const userSchema = new mongoose.Schema({
    googleId: { type: String, required: function(){
      return this.signUpMethod === 'google'
    } },
    name: { type: String, required: true },
    email: { type: String, required: true,},
    password: { type: String, validate: {
      validator: function(v) {
        return this.googleId || v.length > 0; 
      } , message: 'Password is required for manual sign-up'} },
    phone: { type: String,validate: {
      validator: function(v) {
        return this.googleId || v.length > 0;
      },
      message: 'Phone number is required for manual sign-up'
    }},
    blocked: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    verificationToken: {type: String, required: false,},
    verificationTokenExpires: {type: Date,required: false,},
    resetToken: {type:String,default:null},
    resetTokenExpires: {type: Date,default:null,},
  });

const User = mongoose.model("users", userSchema )
module.exports = User