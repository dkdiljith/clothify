import ErrorMessage from '../utils/ErrorMessage.js';
import User from '../models/userSchema.js';
import Admin from '../models/adminSchema.js';


//=======================================================================================================//

// --- USER MIDDLEWARE ---
exports.userAuth = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect('/user/login');
    }

    const user = await User.findById(req.session.user._id).lean();

    // Check if user is missing, blocked, or inactive
    if (!user || user.blocked || !user.isActive) {
      return req.session.save(() => {
        
        if (user?.blocked || (user && !user.isActive)) {
          return ErrorMessage.userUnavailableError(req, res);
        }
        return res.redirect('/user/login');
      });
    }
    req.session.user.showWelcomeModal = false;
    next();
  } catch {
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


        next();
    } catch {
        res.status(500).send("Internal Server Error");
    }
};