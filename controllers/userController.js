const User = require("../models/User/userSchema");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto")
let userData 

//=======================//SECURITY FUNCTIONS // Other Used Services====================================

//secure password
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (err) {
    console.log(err);
  }
};

//phone number validation
const validatePhoneStartsWithPlus91 = async (phone) => {
  try {
    if (typeof phone !== "string") {
      throw new Error("Invalid input: phone number must be a string.");
    }

    phone = phone.trim();

    if (!phone.startsWith("+91")) {
      if (phone.startsWith("91")) {
        phone = `+${phone}`;
      } else if (phone.startsWith("0")) {
        phone = `+91${phone.slice(1)}`; 
      } else {
        phone = `+91${phone}`;
      }
    }

    return phone;
  } catch (err) {
    console.error("Error while validating the phone number:", err);
    throw err; 
  }
};

//email verification
const verificationEmailSend = async (email, verificationToken) => {
  try {
    require("dotenv").config();
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "clothifyfashionshop@gmail.com",
        pass: "tjyu mduy epba oyzk",
      },
    });

    const mailOptions = {
      from: "clothifyfashionshop@gmail.com",
      to: email,
      subject: "Email Verification Code",
      text: `Your Email verification code is: ${verificationToken}`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: ", info.response); // Log success
  } catch (error) {
    console.error("Error sending email:", error); // Log error
    return { success: false, message: "Failed to send email", error };
  }
};




// ======================================================================================================
//GET METHODS / RENDERING PAGES

exports.indexRender = async (req, res) => {
  res.render("user/index");
};

exports.homeRender = async (req,res)=>{
  res.render(`user/home` )
}

exports.registerRender = async (req, res) => {
  res.render("user/register", { isAdminLogin: true });
};

exports.loginRender = async (req, res) => {
  res.render("user/login", { isAdminLogin: true });
};

exports.forgetPasswordRender = async (req, res) => {
  res.render("user/forgetPassword", { isAdminLogin: true });
};

exports.userLogout = async (req,res)=>{
  req.session.destroy()
  res.redirect(`/user`)
}
//========================================================================================================
//POST METHODS



exports.register = async (req, res) => {
  const passwordHash = await securePassword(req.body.password);
  const validatePhone = await validatePhoneStartsWithPlus91(req.body.phone);

  // Generate a verification token
  const verificationToken = crypto.randomBytes(3).toString("hex");

  // Set token expiration (1 hour from now)
  const tokenExpiration = Date.now() + 3600000;

  const user = new User({
    name: req.body.name,
    phone: validatePhone,
    email: req.body.email,
    password: passwordHash,
    verificationToken: verificationToken,
    verificationTokenExpires: tokenExpiration,
    isVerified: false,
  });

  const existingUser = await User.findOne({ email:req.body.email})
  if( existingUser){

    res.render(`user/register`, { message: "Email is already registered", isAdminLogin: true });

  }else{
    let result = await user.save();
    if (result) {
      await verificationEmailSend(req.body.email, verificationToken);
      res.render("user/emailVerification" , { isAdminLogin: true });
      userData = result
    }

  }
 
};




exports.login = async (req, res) => {
  const userDataa = await User.findOne({ email: req.body.email });
  if (userDataa) {
    const checkPassword = await bcrypt.compare(
      req.body.password,
      userDataa.password
    );
    if (checkPassword) {
      req.session.userIsLoggedIn = true
      res.render("user/home" ,{user:userData});
      userData = userDataa
    } else {
      res.render("user/login" , {message:"Invalid Email or Password" , isAdminLogin:true});
    }
  }
};



exports.emailVerification = async (req, res) => {
  try {
    const { email } = userData;

    // Find the user by email and verification token
    const user = await User.findOne({
      email: email,
      verificationToken:req.body.verificationCode ,
      verificationTokenExpires: { $gt: Date.now() }, // Token should not be expired
    });

    if (!user) {
        res.status(400).render("user/emailVerification", {
        message: "Invalid or expired verification token. Please try again.",
        isAdminLogin: false, // Adjust based on your use case
      });
    }else if(user){

      // Update user to set isVerified as true and clear token fields
    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    
    await user.save();

    }
    req.session.userIsLoggedIn = true
    // Render the home page after successful verification
    res.render("user/home", {
      user:userData
    });
  } catch (error) {
    console.error("Error during email verification:", error);

    // Render an error page or send an error response
    res.status(500).render("error", {
      message: "An error occurred during email verification. Please try again.",
      error: error.message,
    });
  }
};



exports.showUsers =  async (req, res) => {  // Route to display products
  try {
      const user = await User.find().lean(); // Fetch ALL products from the database


      res.render('admin/usersList', { 
          admin: true, // Assuming this is always true for admin pages
          user: user // Pass the products data to the template
      });

  } catch (error) {
      console.error("Error fetching products:", error);
      res.render('admin/usersList', { 
          admin: true, 
          user: [], // Important: Pass an empty array in case of error
          errorMessage: "Error fetching products. Please try again later." // Optional error message
      });
      // Or, for API routes, you might want:
      // res.status(500).json({ error: "Error fetching products" });
  }
}