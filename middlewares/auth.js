const ErrorMessage = require(`../utils/ErrorMessage`);
const User = require("../models/userSchema");
const Admin = require(`../models/adminSchema`)

//MESSAGE_CONSTANTS
const MESSAGES = require(`../utils/constants`)

//=======================================================================================================//

// --- USER MIDDLEWARE ---
exports.userAuth = async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.redirect('/user/login');
        }

        const user = await User.findById(req.session.user._id).lean();

        if (!user || user.blocked || !user.isActive) {
            return req.session.save(() => {
                if (user?.blocked || !user.isActive) return ErrorMessage.userUnavailableError(req, res);
                return res.redirect('/user/login');
            });
        }

        next();
    } catch (error) {
        console.error("User Auth Error:", error);
        res.status(500).send("Internal Server Error");
    }
};





// --- ADMIN MIDDLEWARE ---
exports.adminAuth = async (req, res, next) => {
    try {
        if (!req.session.admin) {
            return res.redirect('/admin');
        }

        const admin = await Admin.findById(req.session.admin._id).lean();

        if (!admin) {
            delete req.session.admin;

            return req.session.save(() => {
                return res.redirect('/admin');
            });
        }

        res.locals.admin = admin;
        next();
    } catch (error) {
        console.error("Admin Auth Error:", error);
        res.status(500).send("Internal Server Error");
    }
};