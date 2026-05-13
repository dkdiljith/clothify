const User = require("../models/userSchema");
const Product = require(`../models/productSchema`)
const Wallet = require(`../models/walletSchema`)
const Coupon = require(`../models/couponSchema`)
const Offer = require(`../models/offerSchema`)

const bcrypt = require("bcrypt");
const crypto = require("crypto");

//pagination
const adminPaginationFactory = require(`../services/pagination`);

//verification email
const verificationEmailSend = require(`../services/VerificationEmail`).verificationEmailSend

//MESSAGE_CONSTANTS
const MESSAGES = require(`../services/constants`)


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



const sendResetEmail = async (email, resetToken) => {
  try {
    require("dotenv").config();
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "clothifyfashionshop@gmail.com",
        pass: "tjyu mduy epba oyzk",
      },
    });

    // Updated reset link with /user/resetPassword path
    const resetLink = `${process.env.BASE_URL || 'http://localhost:3000'}/user/resetpassword/${resetToken}`;

    const mailOptions = {
      from: "Clothify Fashion <clothifyfashionshop@gmail.com>",
      to: email,
      subject: "Password Reset Request - Clothify",
      text: `You requested a password reset for your Clothify account.\n\n`
        + `Please click the following link to reset your password:\n${resetLink}\n\n`
        + `This link will expire in 1 hour.\n\n`
        + `If you didn't request this, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://i.postimg.cc/bJGbH05N/Clothify-logo.png" alt="Clothify Logo" style="height: 50px;">
          </div>
          <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>You requested a password reset for your Clothify account.</p>
          <p>Please click the button below to reset your password:</p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${resetLink}" 
               style="display: inline-block; padding: 12px 24px; background-color: #007bff; 
                      color: white; text-decoration: none; border-radius: 4px; font-weight: bold;
                      font-size: 16px;">
              Reset Password
            </a>
          </div>
          
          <p style="margin-top: 20px; font-size: 14px; color: #666;">
            Or copy and paste this URL into your browser:<br>
            <a href="${resetLink}" style="color: #007bff; word-break: break-all;">${resetLink}</a>
          </p>
          
          <p style="font-size: 14px; color: #ff5252;">
            <strong>Note:</strong> This link will expire in 1 hour.
          </p>
          
          <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #777; text-align: center;">
            <p>© ${new Date().getFullYear()} Clothify. All rights reserved.</p>
            <p>Clothify Fashion Shop, 123 Fashion Street, Style City</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Password reset email sent: ", info.response);
    return { success: true, message: "Password reset email sent successfully" };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return { success: false, message: "Failed to send password reset email", error };
  }
};

// utils/emailSender.js
const sendPasswordChangedEmail = async (email) => {

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "clothifyfashionshop@gmail.com",
      pass: "tjyu mduy epba oyzk",
    },
  });

  const mailOptions = {
    to: email,
    subject: 'Your Clothify Password Was Changed',
    html: `
          <p>Your password was successfully updated.</p>
          <p>If you didn't make this change, please contact support.</p>
      `
  };
  await transporter.sendMail(mailOptions);
};



//wallet creation
async function createWallet(userId) {
  try {
    const existingWallet = await Wallet.findOne({ userId });

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

exports.indexRender = async (req, res) => {
  return res.render("user/index", { isAdminLogin: true });
};


exports.homeRender = async (req, res) => {
  const product = await Product.find().lean()


  //checking coupon expiration





  let product8 = []
  if (product) {
    product8 = product.reverse().slice(0, 8);
  }
  return res.render(`user/home`, {
    product: product8
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
    });

    if (!user) {
      return res.redirect('/user/forgetPassword');
    }

    // Render reset password page with token
    return res.render('user/resetPassword', {
      token,
      isAdminLogin: true
    });

  } catch (error) {
    console.error('Reset password load error:', error);
    return res.redirect('/user/forgetPassword');
  }
}












exports.registerRender = async (req, res) => {
  return res.render("user/register", { isAdminLogin: true });
};

exports.loginRender = async (req, res) => {
  return res.render("user/login", { isAdminLogin: true });
};

exports.forgetPasswordRender = async (req, res) => {
  return res.render("user/forgetPassword", { isAdminLogin: true });
};

exports.userLogout = async (req, res) => {
  req.session.destroy()
  return res.redirect(`/user/login`)
}

//========================================================================================================
//POST METHODS



exports.register = async (req, res) => {
  const passwordHash = await securePassword(req.body.password);
  const validatePhone = await validatePhoneStartsWithPlus91(req.body.phone);

  const { verificationToken, tokenExpiration } = generateVerificationCode();

  const existingUser = await User.findOne({ email: req.body.email });
  if (existingUser) {
    if (existingUser.isVerified) {
      return res.render('user/register', { message: "Email is already registered", isAdminLogin: true });
    } else {
      const checkPassword = await bcrypt.compare(
        req.body.password,
        existingUser.password
      );

      if (checkPassword) {
        req.session.unknown_user = { _id: existingUser._id, email: existingUser.email }
        await verificationEmailSend(req.body.email, verificationToken);
        return res.render("user/emailVerification", { isAdminLogin: true, verificationTimer: existingUser.verificationTimer, verificationAttempts: existingUser.verificationAttempts });
      } else {
        return res.render('user/register', { message: "Email is already registered", isAdminLogin: true });
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
        return res.render("user/emailVerification", { isAdminLogin: true, verificationTimer: user.verificationTimer, verificationAttempts: user.verificationAttempts });
      }
    } catch (error) {
      console.error("Error during registration:", error);
      return res.render('user/register', { message: "Error during registration", isAdminLogin: true });
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
    req.session.user = { _id: user._id };

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

    if (!userId) {
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

        req.session.user = { _id: user._id };
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

  if (!userId) {
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


    const userId = req.params.id; // Should get the ID here
    const user = await User.findById(userId); // Use the received userId

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }


    // Toggle blocked status
    user.blocked = !user.blocked;
    await user.save();
    return res.redirect('back');
  } catch (error) {
    console.error("Error in blocking user:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
