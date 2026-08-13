const Admin = require('../models/adminSchema');
const bcrypt = require('bcryptjs');

/////////////////////////////////////////////////////////////////////////////////////////

//secure password
const securePassword = async (password) => {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
};


/////////////////////////////////////////////////////////////////////////////////////////


exports.authenticateAdmin = async (email, password) => {
    const admin = await Admin.findOne({ email }).lean();

    if (!admin) {
        return { success: false, error: 'adminNotFound' };
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
        return { success: false, error: 'incorrectPassword' };
    }

    return {
        success: true,
        admin: {
            _id: admin._id,
            name: admin.name,
            email: admin.email,
        }
    };
};




exports.registerAdmin = async (adminData) => {
    const { name, email, password } = adminData;

    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email }).lean();
    if (existingAdmin) {
        return { success: false, error: 'emailExists' };
    }

    // Hash password
    const passwordHash = await securePassword(password);

    // Create admin
    const admin = await Admin.create({
        name,
        email,
        password: passwordHash,
    });

    return {
        success: true,
        admin: {
            _id: admin._id,
            name: admin.name,
            email: admin.email,
        }
    };
};