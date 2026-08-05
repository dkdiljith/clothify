const User = require("../models/userSchema");
const Product = require(`../models/productSchema`)
const Wallet = require(`../models/walletSchema`)
const Settings = require(`../models/settingSchema`)
const Wishlist = require(`../models/wishListSchema`)
const Otp = require(`../models/otpSchema`)

const bcrypt = require("bcryptjs");
const crypto = require("crypto");

//pagination
const adminPaginationFactory = require(`../utils/pagination`);

//nodemailer
const verificationEmailSend = require(`../services/nodemailer`).verificationEmailSend
const sendResetEmail = require(`../services/nodemailer`).passwordResetEmailSend

//MESSAGE_CONSTANTS
const MESSAGES = require(`../utils/constants`)

//////////////wallet cretaion/////////////////////
const createWallet = require(`../controllers/walletController`).createWallet
const createReferral = require(`../controllers/referralController`).createReferral


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


// Email verification code generator
const generateVerificationCode = () => {
  const verificationToken = crypto.randomInt(100000, 1000000).toString();
  const tokenExpiration = Date.now() + 900000; // 15 minutes in milliseconds

  return { verificationToken, tokenExpiration };
};


const generateOtp = () => {
  const otp = crypto.randomInt(100000, 1000000).toString();
  return { otp };
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
  } catch (error) {
    console.error(error);
  }
};


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
    return res.redirect(`/user/home`)
  }
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
  try {
    // 1. Secure inputs first inside the try block
    const passwordHash = await securePassword(req.body.password);
    const validatePhone = await validatePhoneStartsWithPlus91(req.body.phone);
    const { verificationToken, tokenExpiration } = generateVerificationCode();

    const existingUser = await User.findOne({ email: req.body.email });

    if (existingUser) {
      // Scenario A: User is already fully registered
      if (existingUser.isVerified) {
        return res.render('user/register', { message: "Email is already registered", plain_body: true });
      }

      // Scenario B: User exists but is unverified (Overwrite old token and let them try verifying again)
      existingUser.password = passwordHash; // Update to latest password choice
      existingUser.phone = validatePhone;
      existingUser.name = req.body.name;
      existingUser.verificationToken = verificationToken;
      existingUser.verificationTokenExpires = tokenExpiration;
      existingUser.verificationAttempts += 1;
      existingUser.verificationTimer = Date.now() + 60000; // 1 minute timer

      await existingUser.save();
      await verificationEmailSend(req.body.email, verificationToken);

      req.session.unknown_user = { _id: existingUser._id, email: existingUser.email };

      return res.render("user/emailVerification", {
        plain_body: true,
        verificationTimer: existingUser.verificationTimer,
        verificationAttempts: existingUser.verificationAttempts
      });
    }

    const user = new User({
      name: req.body.name,
      phone: validatePhone,
      email: req.body.email,
      password: passwordHash,
      verificationToken: verificationToken,
      verificationTokenExpires: tokenExpiration,
      verificationAttempts: 1,
      verificationTimer: Date.now() + 60000
    });

    await user.save();
    await verificationEmailSend(req.body.email, verificationToken);

    req.session.unknown_user = { _id: user._id, email: user.email };

    return res.render("user/emailVerification", {
      plain_body: true,
      verificationTimer: user.verificationTimer,
      verificationAttempts: user.verificationAttempts
    });

  } catch (error) {
    console.error("Error during registration:", error);
    return res.render('user/register', { message: "Error during registration", plain_body: true });
  }
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

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};



exports.emailVerification = async (req, res) => {
  try {
    const userId = req.session.unknown_user?._id; // Safe navigation operator
    if (!userId) {
      return res.status(401).json({ success: false, error: "Session expired. Please log in again." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // 1. Rate Limiting Check
    if (user.verificationAttempts >= 5) { // Recommended >= instead of >
      user.verificationTimer = new Date(Date.now() + 86400000); // 24 hours
      user.verificationAttempts = 0;
      await user.save(); // Fix 1: Added await
      return res.status(429).json({ success: false, error: "Maximum attempts reached. Try again in 24 hours." }); // 429 is best for rate-limiting
    }

    // 2. Token Matching Logic
    if (user.verificationToken === req.body.verificationCode) {
      if (user.verificationTokenExpires > Date.now()) {
        user.isVerified = true;
        user.verificationToken = null;
        user.verificationTokenExpires = null;
        user.verificationAttempts = 0;
        user.verificationTimer = null;
        await user.save();

        req.session.user = {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || null,
          blocked: user.blocked
        };

        //session for showing modal for newely registered users
        req.session.user.showWelcomeModal = true;

        // Clean up temporary user tracking session token context memory
        delete req.session.unknown_user;

        // Safely call wallet creation (ensure this handles async internally if needed)
        await createWallet(user._id);
        await createReferral(user._id);

        return res.json({ success: true, message: "Email verified successfully" });
      } else {
        // Fix 2: Increment failure count even on expired tokens
        user.verificationAttempts += 1;
        await user.save();
        console.log("verification code expired");
        return res.json({ success: false, error: "Verification code expired" });
      }
    } else {
      // Fix 2: Increment tracking count on incorrect entries
      user.verificationAttempts += 1;
      await user.save();
      console.log("invalid verification code");
      return res.json({ success: false, error: "Invalid verification code" });
    }
  } catch (error) {
    console.error("Error during email verification:", error);
    return res.status(500).json({ success: false, error: "An error occurred during verification" });
  }
};




exports.resendEmailVerification = async (req, res) => {
  try {
    // 1. Safe Session Check (Prevents server crashes)
    if (!req.session || !req.session.unknown_user) {
      return res.status(401).json({ success: false, error: "Session expired. Please log in again." });
    }

    const userId = req.session.unknown_user._id;
    const userEmail = req.session.unknown_user.email;

    // 2. Database Fetch
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // 3. Timer Check
    const currentTime = Date.now();
    if (user.verificationTimer > currentTime) {
      return res.json({
        success: false,
        newTimer: user.verificationTimer,
        error: "Please wait 1 minute before requesting a new code."
      });
    }

    // 4. Generate & Assign New Token Data
    const { verificationToken, tokenExpiration } = generateVerificationCode();

    user.verificationToken = verificationToken;
    user.verificationTokenExpires = new Date(tokenExpiration); // Ensure it saves as ISODate
    user.verificationAttempts += 1;
    user.verificationTimer = new Date(currentTime + 60000); // 1 minute from now

    // 5. Save to Database First
    await user.save();

    // 6. Send Email Safely
    const emailResult = await verificationEmailSend(userEmail, verificationToken);

    // 7. Proper response delivery
    return res.json({ success: true, newTimer: user.verificationTimer });

  } catch (error) {
    console.error("Resend Email Error:", error);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
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
  } catch (error) {
    console.error(error);
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
  } catch (error) {
    console.error("Error in blocking user:", error);
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

  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: "Password is Not Verified" });
  }
}






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

    if (existingOtp?.resendCount > 3) {
      return res.status(400).json({
        success: false,
        message: "OTP Resend Limit Exceeded, Try again Tomorrow"
      });
    }
    const user = await User.findById(userId).lean()
    const anyone = await User.findOne({ email: validatedEmail }).lean()
    if (anyone) {
      return res.status(409).json({
        success: false,
        message: "This email address is already registered to another account."
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
            expiresAt: new Date(Date.now() + (5 * 60 * 1000)) // Extend window by 5 mins
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

    const emailSend = await verificationEmailSend(validatedEmail, otp);
    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your email inbox successfully.'
    });

  } catch (error) {
    console.log(error)
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
    if (existingOtp.attempts >= 3) {
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

  } catch (error) {
    console.error("Reset Email Error:", error);
    return res.status(500).json({ success: false, message: "Email reset failed due to a server error." });
  }
};
