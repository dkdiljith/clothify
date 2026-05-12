const Admin = require("../models/adminSchema")
const bcrypt = require("bcrypt");
const Order = require(`../models/orderSchema`)

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
////////////////////////////////////////////////////////////////////////////////////////////////////////




//GET REQUESTS
exports.loginRender = async (req, res) => {
  return res.render(`admin/login`, { isAdminLogin: true })
}
exports.registerRender = async (req, res) => {
  return res.render(`admin/register`, { isAdminLogin: true })
}
exports.logout = async (req, res) => {
  req.session.destroy()
  return res.redirect(`/admin`)
}
exports.dashboardRender = async (req, res) => {
  return res.render(`admin/dashboard`, { admin: true })
}
exports.activityLogRender = async (req, res) => {
  return res.render(`admin/activity-log`, { admin: true })
}



//POST methods
exports.register = async (req, res) => {
  const passwordHash = await securePassword(req.body.password);
  const validatePhone = await validatePhoneStartsWithPlus91(req.body.phone);

  const admin = new Admin({
    name: req.body.name,
    phone: validatePhone,
    email: req.body.email,
    password: passwordHash,
  });

  const existingUser = await Admin.findOne({ email: req.body.email })
  if (existingUser) {

    return res.render(`admin/register`, { message: "Email is already registered", isAdminLogin: true });

  } else {
    let result = await admin.save();
    if (result) {
      return res.render("admin/dashboard", { admin: true });
    }

  }

};



exports.login = async (req, res) => {
  try {
    const admin = await Admin.findOne({ email: req.body.email });

    if (!admin) {
      return res.render("admin/login", { message: "Invalid Email or Password", isAdminLogin: true });
    }

    const checkPassword = admin.password
      ? await bcrypt.compare(req.body.password, admin.password)
      : false;

    if (checkPassword) {

      req.session.admin = { _id: admin._id }

      return res.render("admin/dashboard", { admin: true });
    } else {
      return res.render("admin/login", { message: "Invalid Email or Password", isAdminLogin: true });
    }

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).send("Internal Server Error");
  }
};

