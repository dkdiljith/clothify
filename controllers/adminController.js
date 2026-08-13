const adminService = require("../services/adminService");

//MESSAGE_CONSTANTS
// const MESSAGES = require(`../utils/constants`)

////////////////////////////////////////////////////////////////////////////////////////////////////////


exports.loginRender = async (req, res) => {
  if (req.session.admin) {
    return res.redirect(`admin/dashboard`);
  }
  return res.render(`admin/login`, { plain_body: true });
};



exports.registerRender = async (req, res) => {
  return res.render(`admin/register`, { plain_body: true });
};



exports.activityLogRender = async (req, res) => {
  return res.render(`admin/activity-log`);
};



exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Input Validation
    if (!email || !password) {
      return res.redirect("/admin?error=missingFields");
    }
    // Delegate authentication to the service layer
    const authResult = await adminService.authenticateAdmin(email, password);
    if (!authResult.success) {
      return res.redirect(`/admin?error=${authResult.error}`);
    }
    // Session Management
    req.session.admin = authResult.admin;
    await new Promise((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });
    return res.redirect("/admin/dashboard");
  } catch {
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
    // PASSWORD VALIDATION
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.redirect("/admin/register?error=weakPassword");
    }
    // CONFIRM PASSWORD
    if (password !== confirmPassword) {
      return res.redirect("/admin/register?error=passwordMismatch");
    }
    // Delegate database registration logic to the service layer
    const result = await adminService.registerAdmin({
      name: trimmedName,
      email: trimmedEmail,
      password,
    });
    if (!result.success) {
      return res.redirect(`/admin/register?error=${result.error}`);
    }
    // LOGIN ADMIN (Session handling)
    req.session.admin = result.admin;
    await new Promise((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });
    return res.redirect("/admin/dashboard");
  } catch {
    return res.redirect("/admin/register?error=serverError");
  }
};



exports.logout = (req, res) => {
  delete req.session.admin;
  req.session.save((err) => {
    if (err) {
      return res.json({
        success: true,
        message: "Error logging out",
      });
    }
    res.redirect("/admin");
  });
};
