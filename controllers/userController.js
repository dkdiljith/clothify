const User = require("../models/userSchema");
const Product = require(`../models/productSchema`)
const Wallet = require(`../models/walletSchema`)
const Coupon = require(`../models/couponSchema`)
const Offer = require(`../models/offerSchema`)

const bcrypt = require("bcryptjs");
const crypto = require("crypto");

//pagination
const adminPaginationFactory = require(`../utils/pagination`);

//nodemailer
const verificationEmailSend = require(`../services/nodemailer`).verificationEmailSend
const sendResetEmail = require(`../services/nodemailer`).passwordResetEmailSend

//MESSAGE_CONSTANTS
const MESSAGES = require(`../utils/constants`)


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

// Email verification code generator
const generateVerificationCode = () => {
  const verificationToken = crypto.randomBytes(3).toString("hex");
  const tokenExpiration = Date.now() + 900000; // 15 minutes in milliseconds
  return { verificationToken, tokenExpiration };
};






//wallet creation
async function createWallet(userId) {
  try {
    const existingWallet = await Wallet.findOne({ userId }).lean()

    if (existingWallet) {
      return existingWallet;
    }

    const newWallet = new Wallet({
      userId: userId,
      balance: 0,
      transactions: [],
    });

    const savedWallet = await newWallet.save();
    return savedWallet;
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      console.error("Wallet creation failed: Wallet already exists for this user.");
      return null; // Or throw a specific error object
    } else {
      console.error("Error creating wallet:", error);
      throw error; // Rethrow other errors
    }
  }
}



// ======================================================================================================
//GET METHODS / RENDERING PAGES


exports.homeRender = async (req, res) => {
  const product = await Product.find().limit(8).lean()

  return res.render(`user/home`, {
    product: product
  })
}


// Display reset password form (with token verification)
exports.resetPasswordRender = async (req, res) => {
  try {
    const token = req.params.token

    if (!token) {
      return res.redirect('/user/forgetPassword');
    }

    // Verify token exists and isn't expired
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.redirect('/user/forgetPassword');
    }

    // Render reset password page with token
    return res.render('user/resetPassword', {
      token,
      plain_body: true
    });

  } catch (error) {
    console.error('Reset password load error:', error);
    return res.redirect('/user/forgetPassword');
  }
}












exports.registerRender = async (req, res) => {
  return res.render("user/register", { plain_body: true });
};

exports.loginRender = async (req, res) => {
  return res.render("user/login", { plain_body: true });
};

exports.forgetPasswordRender = async (req, res) => {
  return res.render("user/forgetPassword", { plain_body: true });
};

exports.userLogout = (req, res) => {
  delete req.session.user;

  req.session.save((err) => {
    if (err) return res.status(500).send("Error");
    res.redirect("/user/login");
  });
};

//========================================================================================================
//POST METHODS



exports.register = async (req, res) => {
  const passwordHash = await securePassword(req.body.password);
  const validatePhone = await validatePhoneStartsWithPlus91(req.body.phone);

  const { verificationToken, tokenExpiration } = generateVerificationCode();

  const existingUser = await User.findOne({ email: req.body.email });
  if (existingUser) {
    if (existingUser.isVerified) {
      return res.render('user/register', { message: "Email is already registered", plain_body: true });
    } else {
      const checkPassword = await bcrypt.compare(
        req.body.password,
        existingUser.password
      );

      if (checkPassword) {

        req.session.unknown_user = { _id: existingUser._id, email: existingUser.email }
        await verificationEmailSend(req.body.email, verificationToken);
        return res.render("user/emailVerification", { plain_body: true, verificationTimer: existingUser.verificationTimer, verificationAttempts: existingUser.verificationAttempts });
      } else {
        return res.render('user/register', { message: "Email is already registered", plain_body: true });
      }
    }

  } else {
    try {
      const user = new User({
        name: req.body.name,
        phone: validatePhone,
        email: req.body.email,
        password: passwordHash,
        verificationToken: verificationToken,
        verificationTokenExpires: tokenExpiration,
      });

      let result = await user.save();

      if (result) {
        req.session.unknown_user = { _id: user._id, email: user.email }
        await verificationEmailSend(req.body.email, verificationToken);
        user.verificationAttempts += 1
        user.verificationTimer = Date.now() + 60000; //1 munute timer
        await user.save()
        return res.render("user/emailVerification", { plain_body: true, verificationTimer: user.verificationTimer, verificationAttempts: user.verificationAttempts });
      }
    } catch (error) {
      console.error("Error during registration:", error);
      return res.render('user/register', { message: "Error during registration", plain_body: true });
    }
  }
};





exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    if (!user.password) {
      return res.status(404).json({ success: false, error: "Try Forgot Password" });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ success: false, error: "User is not verified" });
    }

    if (user.blocked) {
      return res.status(403).json({ success: false, error: "User is blocked by admin" });
    }

    // Save session
    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || null
    };

    // Create wallet if needed
    await createWallet(user._id);

    return res.status(200).json({ success: true, message: "Login successful" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};



exports.emailVerification = async (req, res) => {
  try {
    const userId = req.session.unknown_user._id
    const user = await User.findById(userId);

    if (!userId || !user) {
      return res.status(404).json({ success: false, error: "An Error Occured" });
    }



    if (user.verificationAttempts > 5) {
      user.verificationTimer = Date.now() + 86400000; //24 hours
      user.verificationAttempts = 0
      user.save()
      return res.status(404).json({ success: false, error: "Maximum attempts reached" });
    }

    if (user.verificationToken === req.body.verificationCode) {
      if (user.verificationTokenExpires > Date.now()) {
        user.isVerified = true;
        user.verificationToken = null;
        user.verificationTokenExpires = null;
        user.verificationAttempts = 0
        user.verificationTimer = null
        await user.save();

        req.session.user = {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || null
        };
        createWallet(user._id);


        return res.json({ success: true, message: "Email verified successfully" });
      } else {
        console.log("verification code expired")
        return res.json({ success: false, error: "Verification code expired" });
      }
    } else {
      console.log("invalid verification code")
      return res.json({ success: false, error: "Invalid verification code" });
    }
  } catch (error) {
    console.error("Error during email verification:", error);
    console.log("an error occured")
    return res.status(500).json({ success: false, error: "An error occurred during verification" });
  }
};




exports.resendEmailVerification = async (req, res) => {
  const userId = req.session.unknown_user._id
  const userEmail = req.session.unknown_user.email
  const user = await User.findById(userId);

  if (!userId || !userEmail || !user) {
    return res.status(404).json({ success: false, error: "An Error Occured" });
  }

  if (user.verificationTimer <= Date.now()) {
    let { verificationToken, tokenExpiration } = generateVerificationCode();

    user.verificationToken = verificationToken,
      user.verificationTokenExpires = tokenExpiration,
      user.verificationAttempts += 1
    user.verificationTimer = new Date(Date.now() + 60000); // 1 minute from now
    await user.save();

    await verificationEmailSend(userEmail, verificationToken);

    if (verificationEmailSend) {
      return res.json({ success: true, newTimer: user.verificationTimer }); // send new timer back
    }
  } else {
    return res.json({ success: false, newTimer: user.verificationTimer, error: "Reached Maximum Limit" });
  }

};



exports.forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const MAX_RESET_ATTEMPTS = 3;
    const RESET_COOLDOWN = 30 * 60 * 1000; // 30 minutes

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({
        message: 'If an account exists, a reset link has been sent'
      });
    }

    // Check reset attempts and cooldown
    const now = Date.now();
    if (user.resetAttempts >= MAX_RESET_ATTEMPTS &&
      user.resetTimer &&
      user.resetTimer > now) {
      return res.status(429).json({
        error: 'Too many attempts. Try again later.',
        resetTimer: user.resetTimer
      });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(now + 3600000); // 1 hour

    // Update user
    user.resetToken = token;
    user.resetTokenExpires = tokenExpires;
    user.resetAttempts += 1;
    user.resetTimer = new Date(now + RESET_COOLDOWN);
    await user.save();


    await sendResetEmail(user.email, token);

    // Render page with timer
    return res.status(200).json({
      success: true,
      resetTimer: user.resetTimer
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ error: 'Error processing request' });
  }
};

// Resend Reset Email
exports.resendResetEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        message: 'If an account exists, a reset link has been sent'
      });
    }

    // Check cooldown
    const now = Date.now();
    if (user.resetTimer && user.resetTimer > now) {
      return res.status(429).json({
        error: 'Please wait before requesting another reset',
        newResetTimer: user.resetTimer
      });
    }

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(now + 3600000);

    // Update user
    user.resetToken = token;
    user.resetTokenExpires = tokenExpires;
    user.resetAttempts += 1;
    user.resetTimer = new Date(now + 1800000); // 30 minute cooldown
    await user.save();

    // Send email
    const resetUrl = `${req.protocol}://${req.get('host')}/resetpassword?token=${token}`;
    await sendResetEmail(user.email, resetUrl);

    return res.status(200).json({
      success: true,
      newResetTimer: user.resetTimer
    });

  } catch (error) {
    console.error('Resend reset email error:', error);
    return res.status(500).json({ error: 'Error processing request' });
  }
};



exports.resetPassword = async (req, res) => {
  try {

    // Passwords from request body
    const { oldPassword, newPassword, token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Token is required"
      });
    }

    const user = await User.findOne({
      resetToken: token,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    if (!user.password) {
      return res.status(404).json({ success: false, error: "Google Login Detected" });
    }

    const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({ success: false, error: "Invalid Password" });
    }

    // ... password validation and update ...
    user.password = await bcrypt.hash(newPassword, 12);
    user.resetToken = null;
    user.resetTokenExpires = null;
    user.resetAttempts = 0,
      user.resetTimer = null
    await user.save();

    sendPasswordChangedEmail(user.email)

    return res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};





exports.showUsers = async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const query = req.query.query || '';
    const result = await adminPaginationFactory({
      page,
      limit: 5,
      query,
      type: 'user'
    });
    return res.render('admin/usersList', {
      admin: true,
      ...result
    });

  } catch (error) {

    console.error("Error fetching users:", error);
    return res.render('admin/usersList', {

      admin: true,
      user: [],
      query: '',
      pagination: {
        page: 1,
        limit: 5,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
        serialNumberStart: 0
      },
      errorMessage: "Error fetching users. Please try again later."
    });
  }
};



exports.blockUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.status(404).json({ message: "User not found" });
    }

    // This instantly flips true to false, or false to true
    await User.updateOne(
      { _id: userId },
      [{ $set: { blocked: { $not: "$blocked" } } }]
    );


    return res.redirect('back');
  } catch (error) {
    console.error("Error in blocking user:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
