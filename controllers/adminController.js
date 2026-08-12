const Admin = require("../models/adminSchema")
const bcrypt = require("bcryptjs");

//MESSAGE_CONSTANTS
// const MESSAGES = require(`../utils/constants`)

//=======================//SECURITY FUNCTIONS // Other Used Services====================================

//secure password
const securePassword = async (password) => {
  const passwordHash = await bcrypt.hash(password, 10);
  return passwordHash;
};

//phone number validation
const validatePhoneStartsWithPlus91 = async (phone) => {
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
};
////////////////////////////////////////////////////////////////////////////////////////////////////////


exports.loginRender = async (req, res) => {
  if (req.session.admin) {
    return res.redirect(`admin/dashboard`)
  }
  return res.render(`admin/login`, { plain_body: true })
}

exports.registerRender = async (req, res) => {
  return res.render(`admin/register`, { plain_body: true })
}

exports.activityLogRender = async (req, res) => {
  return res.render(`admin/activity-log`)
}




exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input Validation
    if (!email || !password) {
      return res.redirect("/admin?error=missingFields");
    }

    const admin = await Admin.findOne({ email }).lean();

    // Admin Not Found
    if (!admin) {
      return res.redirect("/admin?error=adminNotFound");
    }

    // Password Check
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.redirect("/admin?error=incorrectPassword");
    }

    // Session
    req.session.admin = {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
    };

    await new Promise((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    return res.redirect("/admin/dashboard");

  } catch (error) {
    console.error(error);
    return res.redirect("/admin?error=serverError");
  }
};




exports.register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    // MISSING FIELDS
    if (!name || !email || !password || !confirmPassword) {
      return res.redirect("/admin/register?error=missingFields");
    }
    // NAME VALIDATION
    const trimmedName = name.trim();
    if (
      trimmedName.length < 3 ||
      trimmedName.length > 50 ||
      !/^[A-Za-z ]+$/.test(trimmedName)
    ) {
      return res.redirect("/admin/register?error=invalidName");
    }
    // EMAIL VALIDATION
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.redirect("/admin/register?error=invalidEmail");
    }
    // PASSWORD MATCH
    if (password !== confirmPassword) {
      return res.redirect("/admin/register?error=passwordMismatch");
    }
    // PASSWORD VALIDATION
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.redirect("/admin/register?error=weakPassword");
    }
    // EMAIL EXISTS
    const existingAdmin = await Admin.findOne({
      email: trimmedEmail,
    }).lean();
    if (existingAdmin) {
      return res.redirect("/admin/register?error=emailExists");
    }
    // HASH PASSWORD
    const passwordHash = await securePassword(password);
    // CREATE ADMIN
    await Admin.create({
      name: trimmedName,
      email: trimmedEmail,
      password: passwordHash,
    });
    // SESSION
    const admin = await Admin.findOne({
      email: trimmedEmail,
    }).lean();
    req.session.admin = {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
    };
    await new Promise((resolve, reject) => {
      req.session.save(err => (err ? reject(err) : resolve()));
    });
    return res.redirect("/admin/dashboard");
  } catch (error) {
    console.error("Admin Register Error:", error);
    return res.redirect("/admin/register?error=serverError");
  }
};



exports.logout = (req, res) => {
  delete req.session.admin;

  req.session.save((err) => {
    if (err) {
      return res.json({
        success: true,
        message: "Error logging out"
      });
    }
    res.redirect("/admin");
  });

};
