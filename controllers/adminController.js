const Admin = require("../models/adminSchema")
const bcrypt = require("bcrypt");
const Order = require(`../models/orderSchema`)

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



exports.salesReportRender = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    
    // Build query based on whether dates were provided
    let query = { paymentStatus: 'Completed' };
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      query.createdAt = {
        $gte: start,
        $lte: end
      };
    }

    // Get total count for pagination
    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    // Get paginated results
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Return JSON for AJAX requests
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        success: true,
        orders,
        pagination: {
          page,
          limit,
          totalPages,
          startDate,
          endDate,
          nextPage: page + 1,
          prevPage: page - 1,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    }

    // Return HTML for normal requests
    return res.render('admin/salesReport', {
      admin: true,
      orders,
      pagination: {
        page,
        limit,
        totalPages,
        nextPage: page + 1,
        prevPage: page - 1,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      startDate: startDate || '',
      endDate: endDate || ''
    });

  } catch (error) {
    console.error('Sales report error:', error);
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({
        success: false,
        message: 'Error filtering orders',
        error: error.message
      });
    }
    
    return res.render('admin/salesReport', {
      admin: true,
      orders: [],
      pagination: {
        page: 1,
        limit: 5,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      },
      errorMessage: "Error fetching sales report. Please try again later."
    });
  }
};



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

