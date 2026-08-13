const User = require("../models/userSchema");
const Product = require(`../models/productSchema`)
const Settings = require(`../models/settingSchema`)
const Wishlist = require(`../models/wishListSchema`)
const Otp = require(`../models/otpSchema`)
const mongoose = require("mongoose")

const bcrypt = require("bcryptjs");
const crypto = require("crypto");


//nodemailer
const verificationEmailSend = require(`../utils/nodemailer`).verificationEmailSend
const forgotPasswordEmailSend = require(`../utils/nodemailer`).passwordResetEmailSend
const sendPasswordChangedEmail = require(`../utils/nodemailer`).sendPasswordChangedEmail

//MESSAGE_CONSTANTS
// const MESSAGES = require(`../utils/constants`)

//////////////wallet cretaion/////////////////////
const createWallet = require(`../controllers/walletController`).createWallet
const createReferral = require(`../controllers/referralController`).createReferral


//=======================//SECURITY FUNCTIONS // Other Used Services====================================



//secure password
const securePassword = async (password) => {
  const passwordHash = await bcrypt.hash(password, 10);
  return passwordHash;
};


const generateOtp = () => {
  const otp = crypto.randomInt(100000, 1000000).toString();
  return { otp };
};



const hashOtp = (otp) => {
  const OTP_PEPPER = process.env.OTP_HASH_SECRET;
  return crypto
    .createHmac('sha256', OTP_PEPPER)
    .update(otp)
    .digest('hex');
};


// check otp
const verifyOtp = (otp, storedOtp) => {
  const submittedHash = hashOtp(otp);

  const submittedBuffer = Buffer.from(submittedHash, 'hex');
  const storedBuffer = Buffer.from(storedOtp, 'hex');

  if (submittedBuffer.length !== storedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(submittedBuffer, storedBuffer);
};




const validateAndCleanEmail = (email) => {
  // 1. Basic Presence Check
  if (!email || typeof email !== 'string') return null;

  // 2. Clean up structural noise
  let cleanEmail = email.trim().toLowerCase();

  // 3. Strict RFC-compliant Syntax Check (Regex)
  // This verifies characters, single '@', and valid structure without ReDoS vulnerabilities
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleanEmail)) return null;

  // 4. Strict Domain Verification Block
  const parts = cleanEmail.split('@');
  if (parts.length !== 2) return null; // Safeguard against multiple '@' signs

  const domain = parts[1];

  // Ensure the domain itself doesn't start or end with a hyphen or dot
  if (domain.startsWith('.') || domain.endsWith('.') || domain.startsWith('-') || domain.endsWith('-')) {
    return null;
  }
  // Ensure the top-level domain (TLD) like .com or .org exists and is valid
  const domainParts = domain.split('.');
  if (domainParts.length < 2) return null; // Blocks formats like "user@localhost"

  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) return null; // Blocks invalid extensions like "user@domain.c"

  return cleanEmail;
};




// ======================================================================================================

exports.homeRender = async (req, res) => {
  try {
    const userId = res.locals.user?._id || null;
    const [products, settings, wishlist] = await Promise.all([
      Product.find().limit(8).lean(),
      Settings.findOne({
        settingsType: "global_settings",
      }).lean(),
      userId
        ? Wishlist.findOne({ userId }).lean()
        : null,
    ]);
    // =====================================================
    // MARK WISHLISTED PRODUCTS
    // =====================================================
    if (wishlist?.items) {
      const wishlistSet = new Set(
        wishlist.items.map(item => item.productId.toString())
      );
      products.forEach(product => {
        product.isWishlisted = wishlistSet.has(product._id.toString());
      });
    }
    const showModal = !!(
      req.session.user &&
      req.session.user.showWelcomeModal === true
    );
    const referralSettings = settings?.referralSettings || {
      coinValue: "0.010",
      referrerReward: 300,
      refereeReward: 500,
      signupBonus: 1000,
      referralHoldingPeriodDays: 7,
    };
    return res.render("user/home", {
      product: products,
      showWelcomeModal: showModal,
      referralSettings,
    });
  } catch {
    res.redirect(`/user/home`)
  }
};






exports.registerRender = async (req, res) => {
  if (req.session.user) {
    return res.redirect(`/user/home`)
  }
  return res.render("user/register", { plain_body: true });
};

exports.loginRender = async (req, res) => {
  if (req.session.user) {
    return res.redirect(`/user/home`)
  }
  return res.render("user/login", { plain_body: true });
};

exports.forgetPasswordRender = async (req, res) => {
  if (req.session.user) {
    if (req.query.priority) {
      return res.render("user/forgetPassword", {
        plain_body: true,
        error: req.query.error || null,
        email: req.session.user.email,
      });
    }
    return res.redirect("/user/home");
  }
  return res.render("user/forgetPassword", {
    plain_body: true,
    error: req.query.error || null,
    email: "",
  });
};


exports.userLogout = (req, res) => {
  delete req.session.user;

  req.session.save((err) => {
    if (err) return res.status(500).send("Error");
    res.redirect("/user/login");
  });
};




exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email }).lean()

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
      phone: user.phone || null,
      blocked: user.blocked
    };

    // Create wallet if needed
    await createWallet(user._id);
    await createReferral(user._id)

    return res.status(200).json({ success: true, message: "Login successful" });

  } catch {
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};




exports.register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    // Basic Validation
    if (!name || !email || !password || !confirmPassword) {
      return res.render("user/register", { message: "All fields are required.", plain_body: true });
    }
    if (password !== confirmPassword) {
      return res.render("user/register", { message: "Passwords do not match.", plain_body: true });
    }
    // Normalize Email
    const validatedEmail = validateAndCleanEmail(email);
    const otpPurpose = "EMAIL_VERIFICATION";
    // Check Existing User
    let user = await User.findOne({ email: validatedEmail }).lean();
    if (user?.isVerified) {
      return res.render("user/register", { message: "Email is already registered. Please login.", plain_body: true });
    }
    // Prevent Rapid OTP Requests (5 Second Lock)
    if (user) {
      const existingOtp = await Otp.findOne({ userId: user._id, purpose: otpPurpose }).lean();
      if (existingOtp?.resendCount >= 3) {
        return res.render("user/register", {
          plain_body: true,
          message: "OTP Resend Limit Exceeded, Try again Tomorrow"
        });
      }
      if (existingOtp && (Date.now() - existingOtp.updatedAt.getTime() < 5000)) {
        return res.render("user/register", {
          message: "A verification email was just sent. Please wait 5 seconds before trying again.",
          plain_body: true
        });
      }
    }
    // Expensive Operations
    const passwordHash = await securePassword(password);
    const { otp } = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    // Create User (If New)
    if (!user) {
      user = await User.findOneAndUpdate(
        { email: validatedEmail },
        {
          $setOnInsert: {
            name: name.trim(),
            email: validatedEmail,
            password: passwordHash,
            isVerified: false
          }
        },
        { upsert: true, new: true, lean: true }
      );
    }
    // --- FIX: Separated paths to avoid MongoServerError Path Conflict ---
    // Try updating an existing document first
    const updateResult = await Otp.updateOne(
      { userId: user._id, purpose: otpPurpose },
      {
        $set: { otpHash, attempts: 0, expiresAt },
        $inc: { resendCount: 1 }
      },
      { upsert: false } // Do not upsert here
    );
    // If no document matched, it means it's a new registration creation event
    if (updateResult.matchedCount === 0) {
      await Otp.updateOne(
        { userId: user._id, purpose: otpPurpose },
        {
          $set: { otpHash, attempts: 0, expiresAt },
          $setOnInsert: { resendCount: 0 } // Sets it strictly to 0 on initial creation
        },
        { upsert: true }
      );
    }
    // ------------------------------------------------------------------
    // Send Verification Email
    await verificationEmailSend(validatedEmail, otp);
    // Store Session
    req.session.unknown_user = {
      _id: user._id.toString(),
      email: validatedEmail,
      otpExpiresAt: expiresAt.toISOString(),
      resendAvailableAt: new Date(
        Date.now() + 60000
      ).toISOString()
    };
    // Render Verification Page
    return res.redirect("/user/emailverification");
  } catch {
    return res.render("user/register", { message: "Something went wrong. Please try again.", plain_body: true });
  }
};







exports.emailVerificationRender = (req, res) => {
  const sessionUser = req.session.unknown_user;

  if (!sessionUser) {
    return res.redirect("/user/register");
  }
  res.render("user/emailVerification", {
    plain_body: true,
    verificationTimer: sessionUser.otpExpiresAt,
    resendTimer: sessionUser.resendAvailableAt
  });
};







exports.resendEmailVerification = async (req, res) => {
  try {
    const otpPurpose = "EMAIL_VERIFICATION";
    //  Session Validation
    const sessionUser = req.session.unknown_user;
    if (!sessionUser?._id) {
      return res.status(401).json({
        success: false,
        error: "Session expired. Please register again."
      });
    }
    const validatedEmail = validateAndCleanEmail(sessionUser.email);
    const user = await User.findById(sessionUser._id).lean();
    if (!user) {
      req.session.unknown_user = null;
      return res.status(401).json({
        success: false,
        error: "Session expired. Please register again."
      });
    }
    //  Existing OTP
    const existingOtp = await Otp.findOne({
      userId: user._id,
      purpose: otpPurpose
    }).lean();
    if (!existingOtp) {
      return res.status(404).json({
        success: false,
        error: "Verification session not found."
      });
    }
    //  Resend Limit
    if (existingOtp.resendCount >= 3) {
      return res.status(429).json({
        success: false,
        error: "OTP resend limit exceeded. Please try again tomorrow."
      });
    }
    //  Rapid Click Protection
    if (Date.now() - existingOtp.updatedAt.getTime() < 5000) {
      return res.status(429).json({
        success: false,
        error: "Please wait a few seconds before requesting another OTP."
      });
    }
    //  Generate New OTP
    const { otp } = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + (15 * 60 * 1000));
    const resendAvailableAt = new Date(Date.now() + (60 * 1000));
    //  Update OTP
    await Otp.updateOne(
      {
        userId: user._id,
        purpose: otpPurpose
      },
      {
        $set: {
          otpHash,
          attempts: 0,
          expiresAt
        },
        $inc: {
          resendCount: 1
        }
      }
    );
    //  Send Email
    await verificationEmailSend(validatedEmail, otp);
    //  Update Session Timers
    req.session.unknown_user.otpExpiresAt =
      expiresAt.toISOString();
    req.session.unknown_user.resendAvailableAt =
      resendAvailableAt.toISOString();
    //  Success
    return res.status(200).json({
      success: true,
      message: "Verification code sent successfully.",
      verificationTimer: expiresAt.toISOString(),
      resendTimer: resendAvailableAt.toISOString()
    });
  } catch {
    return res.status(500).json({
      success: false,
      error: "Something went wrong. Please try again."
    });
  }
};






exports.emailVerification = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { verificationCode } = req.body;
    const otpPurpose = "EMAIL_VERIFICATION";
    //  Session Validation
    const sessionUser = req.session.unknown_user;
    if (!sessionUser?._id) {
      await session.abortTransaction();
      return res.status(401).json({
        success: false,
        error: "Session expired. Please register again.",
      });
    }
    if (!verificationCode) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: "Please enter the verification code.",
      });
    }
    const userId = sessionUser._id;
    //  Fetch User
    const user = await User.findById(userId)
      .select("_id name email blocked isVerified")
      .lean()
      .session(session);
    if (!user) {
      await session.abortTransaction();
      delete req.session.unknown_user;
      return res.status(404).json({
        success: false,
        error: "User not found.",
      });
    }
    if (user.isVerified) {
      await session.abortTransaction();
      delete req.session.unknown_user;
      return res.status(400).json({
        success: false,
        error: "Email is already verified.",
      });
    }
    //  Fetch OTP
    const existingOtp = await Otp.findOne({
      userId,
      purpose: otpPurpose,
    })
      .lean()
      .session(session);
    if (!existingOtp) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        error: "No active verification request found.",
      });
    }
    //  OTP Expiry Check
    if (Date.now() > existingOtp.expiresAt.getTime()) {
      await session.abortTransaction();
      return res.status(410).json({
        success: false,
        error: "Verification code has expired.",
      });
    }
    //  OTP Attempt Limit
    if (existingOtp.attempts >= 5) {
      await session.abortTransaction();
      return res.status(429).json({
        success: false,
        error:
          "Maximum verification attempts reached. Please request another OTP.",
      });
    }
    //  Verify OTP
    const isMatch = verifyOtp(verificationCode, existingOtp.otpHash);
    if (!isMatch) {
      await Otp.updateOne(
        { _id: existingOtp._id },
        {
          $inc: {
            attempts: 1,
          },
        },
      ).session(session);
      await session.commitTransaction();
      return res.status(401).json({
        success: false,
        error: "Invalid verification code.",
      });
    }
    //  Verify User
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          isVerified: true,
        },
      },
    ).session(session);
    //  Delete OTP
    await Otp.deleteOne({
      _id: existingOtp._id,
    }).session(session);
    //  Create Wallet
    const wallet = await createWallet(userId, session);
    if (!wallet) {
      await session.abortTransaction();
      delete req.session.unknown_user;
      return res.status(500).json({
        success: false,
        error: "Unable to create wallet.",
      });
    }
    //  Create Referral
    const referral = await createReferral(userId, session);
    if (!referral) {
      await session.abortTransaction();
      delete req.session.unknown_user;
      return res.status(500).json({
        success: false,
        error: "Unable to create referral.",
      });
    }
    //  Commit Transaction
    await session.commitTransaction();
    //  Login Session
    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      blocked: user.blocked,
      showWelcomeModal: true,
    };
    delete req.session.unknown_user;
    //  Success
    return res.status(200).json({
      success: true,
      message: "Email verified successfully.",
    });
  } catch {
    await session.abortTransaction();
    delete req.session.unknown_user;
    return res.status(500).json({
      success: false,
      error: "An unexpected error occurred.",
    });
  } finally {
    session.endSession();
  }
};




//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////





exports.forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const otpPurpose = "FORGOT_PASSWORD";
    //  Input Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required.",
      });
    }
    const validatedEmail = validateAndCleanEmail(email);
    //  Find User
    const user = await User.findOne({
      email: validatedEmail,
    }).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "No account found with this email.",
      });
    }
    //  Existing OTP
    const existingOtp = await Otp.findOne({
      userId: user._id,
      purpose: otpPurpose,
    }).lean();
    if (existingOtp) {
      // Daily resend limit
      if (existingOtp.resendCount >= 3) {
        return res.status(429).json({
          success: false,
          error: "OTP resend limit exceeded. Please try again tomorrow.",
        });
      }
      // Prevent rapid requests
      if (Date.now() - existingOtp.updatedAt.getTime() < 5000) {
        return res.status(429).json({
          success: false,
          error: "Please wait a few seconds before requesting another OTP.",
        });
      }
    }
    //  Generate OTP
    const { otp } = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const resendAvailableAt = new Date(Date.now() + 60 * 1000);
    //  Update Existing OTP
    if (existingOtp) {
      await Otp.updateOne(
        { _id: existingOtp._id },
        {
          $set: {
            otpHash,
            attempts: 0,
            expiresAt,
          },
          $inc: {
            resendCount: 1,
          },
        },
      );
    } else {
      await Otp.create({
        userId: user._id,
        purpose: otpPurpose,
        otpHash,
        attempts: 0,
        resendCount: 0,
        expiresAt,
      });
    }
    //  Send OTP Email
    await forgotPasswordEmailSend(validatedEmail, otp);
    //  Store Session
    req.session.forgot_password = {
      _id: user._id.toString(),
      email: validatedEmail,
      otpExpiresAt: expiresAt.toISOString(),
      resendAvailableAt: resendAvailableAt.toISOString(),
    };
    //  Success
    return res.status(200).json({
      success: true,
      message: "Verification code sent successfully.",
      verificationTimer: expiresAt.toISOString(),
      resendTimer: resendAvailableAt.toISOString(),
    });
  } catch {
    return res.status(500).json({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  }
};






// Display reset password form (with token verification)
exports.resetPasswordRender = async (req, res) => {
  try {
    const otp = req.params.token;
    const otpPurpose = "FORGOT_PASSWORD";
    //  Link Validation
    if (!otp) {
      return res.redirect("/user/forgetPassword?priority=true&&error=invalidLink");
    }
    //  Session Validation
    const forgotPasswordSession = req.session.forgot_password;
    if (!forgotPasswordSession?._id) {
      return res.redirect("/user/forgetPassword?priority=true&&error=sessionExpired");
    }
    const userId = forgotPasswordSession._id;
    //  User Validation
    const user = await User.findById(userId).lean();
    if (!user) {
      delete req.session.forgot_password;
      return res.redirect("/user/forgetPassword?priority=true&&error=userNotFound");
    }
    //  OTP Validation
    const existingOtp = await Otp.findOne({
      userId,
      purpose: otpPurpose,
    }).lean();

    if (!existingOtp) {
      delete req.session.forgot_password;
      return res.redirect("/user/forgetPassword?priority=true&&error=otpNotFound");
    }
    //  Reusable Attempt Increment
    const increaseAttempts = async () => {
      await Otp.updateOne({ _id: existingOtp._id }, { $inc: { attempts: 1 } });
    };
    //  OTP Expired
    if (Date.now() > existingOtp.expiresAt.getTime()) {
      await increaseAttempts();
      delete req.session.forgot_password;
      return res.redirect("/user/forgetPassword?priority=true&&error=otpExpired");
    }
    //  Maximum Attempts
    if (existingOtp.attempts >= 5) {
      delete req.session.forgot_password;
      return res.redirect("/user/forgetPassword?priority=true&&error=maxAttempts");
    }
    //  Verify OTP
    const isValidOtp = verifyOtp(otp, existingOtp.otpHash);
    if (!isValidOtp) {
      await increaseAttempts();
      return res.redirect("/user/forgetPassword?priority=true&&error=invalidLink");
    }

    //  Render Reset Password Page
    await increaseAttempts();
    return res.render("user/resetPassword", {
      plain_body: true,
    });
  } catch {
    delete req.session.forgot_password;
    return res.redirect("/user/forgetPassword?priority=true&&error=serverError");
  }
};







exports.resetPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    //  Session Validation
    const forgotPasswordSession = req.session.forgot_password;
    if (!forgotPasswordSession?._id) {
      return res.status(401).json({
        success: false,
        error: "Password reset session has expired.",
      });
    }
    const userId = forgotPasswordSession._id;
    //  Input Validation
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "All fields are required.",
      });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "Passwords do not match.",
      });
    }
    //  User Validation
    const user = await User.findById(userId).lean();
    if (!user) {
      delete req.session.forgot_password;
      return res.status(404).json({
        success: false,
        error: "User not found.",
      });
    }
    //  Prevent Password Reuse
    if (user.password) {
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          error:
            "Your new password must be different from your current password.",
        });
      }
    }
    //  Secure Password
    const passwordHash = await securePassword(newPassword);
    //  Update Password
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          password: passwordHash,
        },
      },
    );
    //  Consume OTP (Single Use)
    await Otp.updateOne(
      {
        userId,
        purpose: "FORGOT_PASSWORD",
      },
      {
        $set: {
          otpHash: "",
          attempts: 4,
          resendCount: 4,
        },
      },
    );
    //  Cleanup Session
    delete req.session.forgot_password;
    //  Send Notification
    await sendPasswordChangedEmail(user.email);
    //  Success
    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch {
    return res.status(500).json({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  }
};





//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////




exports.showUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    const query = req.query.query || "";
    const accountStatus = req.query.accountStatus || "";
    const filter = {};
    if (query) {
      filter.$or = [
        {
          name: {
            $regex: query,
            $options: "i"
          }
        },
        {
          email: {
            $regex: query,
            $options: "i"
          }
        },
        {
          phone: {
            $regex: query,
            $options: "i"
          }
        }
      ];
    }
    if (accountStatus === "blocked") {
      filter.blocked = true;
    }
    if (accountStatus === "active") {
      filter.blocked = false;
    }
    const [user, totalDocuments] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter)
    ]);
    const totalPages = Math.ceil(totalDocuments / limit);
    return res.render("admin/usersList", {
      admin: true,
      user,
      query,
      accountStatus,
      pagination: {
        page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page + 1,
        prevPage: page - 1,
        serialNumberStart: skip
      }
    });
  } catch {
    return res.render("admin/usersList", {
      admin: true,
      user: [],
      query: "",
      accountStatus: "",
      pagination: {
        page: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
        nextPage: 2,
        prevPage: 0,
        serialNumberStart: 0
      },
      errorMessage: "Error fetching users."
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


    const referer = req.get('Referer') || req.get('referrer') || '/admin/users';
    return res.redirect(referer);
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


exports.verifyPassword = async (req, res) => {
  try {
    const { password } = req.body
    if (!password) {
      return res.status(401).json({ message: "Password Not found" });
    }
    const userId = res.locals.user._id
    const user = await User.findById(userId).lean()
    if (!user.password && user.googleId) {
      return res.status(401).json({ message: "Google Login Detected, Create Password First" });
    }
    const result = await bcrypt.compare(password, user.password)
    if (!result) {
      return res.status(401).json({ message: "Password is incorrect" });
    }
    return res.json({
      success: true,
      message: 'Password Verified Successfully'
    });

  } catch {
    return res.status(500).json({ message: "Password is Not Verified" });
  }
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

exports.verifyEmail = async (req, res) => {
  try {
    const { email } = req.body
    const userId = res.locals.user._id
    const validatedEmail = validateAndCleanEmail(email)

    if (!validatedEmail) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address 2."
      });
    }
    const currentPurpose = "RESET_EMAIL";
    const existingOtp = await Otp.findOne({ userId, purpose: currentPurpose }).lean();

    if (existingOtp?.resendCount >= 3) {
      return res.status(400).json({
        success: false,
        message: "OTP Resend Limit Exceeded, Try again Tomorrow"
      });
    }
    const anyone = await User.findOne({ email: validatedEmail }).lean()
    if (anyone) {
      return res.status(409).json({
        success: false,
        message: "This email address is already registered to an account."
      });
    }
    const { otp } = generateOtp()

    if (existingOtp) {
      await Otp.updateOne(
        { _id: existingOtp._id }, // Locate by unique ID for optimal indexing
        {
          $set: {
            otpHash: hashOtp(otp),
            attempts: 0, // Reset incorrect guesses back to 0 because a fresh code was sent
            expiresAt: new Date(Date.now() + (15 * 60 * 1000)) // Extend window by 15 mins
          },
          $inc: {
            resendCount: 1 // Atomically increment the request rate counter by 1
          }
        }
      );
    } else {
      const verificationDocument = new Otp({
        userId,
        purpose: "RESET_EMAIL",
        otpHash: hashOtp(otp),
        resendCount: 0,
        attempts: 0,
        expiresAt: new Date(Date.now() + (5 * 60 * 1000)) // 5-minute instance
      });

      await verificationDocument.save();
    }

    await verificationEmailSend(validatedEmail, otp);
    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your email inbox successfully.'
    });

  } catch {
    return res.status(500).json({
      success: false,
      message: "Email is not Verified"
    });
  }
}






exports.resetEmail = async (req, res) => {
  try {
    const { otp, email } = req.body;

    // 1. Input Validation
    const validatedEmail = validateAndCleanEmail(email);
    if (!validatedEmail) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }

    if (!otp) {
      return res.status(400).json({ success: false, message: "No OTP detected." });
    }

    const userId = res.locals.user._id;
    const currentPurpose = "RESET_EMAIL";

    // 2. Fetch Stored OTP Document
    const existingOtp = await Otp.findOne({ userId, purpose: currentPurpose }).lean();

    if (!existingOtp) {
      return res.status(404).json({ success: false, message: "No active OTP request found. Please request a new code." });
    }

    // 3. Expiration Check (Uncommented and fixed comparison logic)
    if (Date.now() > existingOtp.expiresAt) {
      return res.status(410).json({ success: false, message: "OTP has timed out. Please generate another OTP." });
    }

    // 4. Rate Limiting Check
    if (existingOtp.attempts >= 5) {
      return res.status(429).json({ success: false, message: "Maximum OTP attempts reached. Please generate another OTP." });
    }

    // 5. Secure Cryptographic Verification
    const isMatch = verifyOtp(otp, existingOtp.otpHash);

    if (!isMatch) {
      // Increment attempt counter atomically on failure
      await Otp.updateOne(
        { _id: existingOtp._id },
        { $inc: { attempts: 1 } }
      );
      return res.status(401).json({ success: false, message: "Invalid OTP code." });
    }

    // 6. Action Execution (Update User Email)
    await User.updateOne(
      { _id: userId },
      { $set: { email: validatedEmail } }
    );

    // 7. Cleanup 
    await Otp.updateOne(
      { _id: existingOtp._id },
      {
        $set: {
          otpHash: "",
          attempts: 4,
          resendCount: 4,
        }
      }
    );

    // 8. Success Response
    return res.status(200).json({ success: true, message: "Email updated successfully!" });

  } catch {
    return res.status(500).json({ success: false, message: "Email reset failed due to a server error." });
  }
};
