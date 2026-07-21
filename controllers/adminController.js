const Admin = require("../models/adminSchema")
const bcrypt = require("bcryptjs");

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
////////////////////////////////////////////////////////////////////////////////////////////////////////


exports.loginRender = async (req, res) => {
  if(req.session.admin){
    return res.redirect(`admin/dashboard`)
  }
  return res.render(`admin/login`, { plain_body: true })
}

exports.registerRender = async (req, res) => {
  return res.render(`admin/register`, { plain_body: true })
}
exports.dashboardRender = async (req, res) => {
  return res.render(`admin/dashboard`)
}
exports.activityLogRender = async (req, res) => {
  return res.render(`admin/activity-log`)
}



exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email }).lean();

    if (!admin) {
      return res.render("admin/login", { message: "Invalid credentials", plain_body: true });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (isMatch) {
      req.session.admin = { _id: admin._id , name:admin.name , email:admin.email};

      return req.session.save((err) => {
        if (err) return next(err);
        res.redirect("/admin/dashboard");
      });
    }

    res.render("admin/login", { message: "Invalid credentials", plain_body: true });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).render("error", { message: "Internal Server Error" });
  }
};



exports.register = async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    // 1. Check existence FIRST (Save CPU)
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.render("admin/register", { message: "Email already exists", plain_body: true });
    }

    // 2. Process data only if valid
    const passwordHash = await securePassword(password);
    const validatedPhone = await validatePhoneStartsWithPlus91(phone);

    const newAdmin = new Admin({
      name,
      email,
      phone: validatedPhone,
      password: passwordHash
    });

    await newAdmin.save();

    res.redirect("/admin/dashboard");
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).send("Internal Server Error");
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
