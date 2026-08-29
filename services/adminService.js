import Admin from '../models/adminSchema.js';
import bcrypt from 'bcryptjs';

//MESSAGE_CONSTANTS
import ADMIN_AUTH_MESSAGES from '../constants/auth.js';

/////////////////////////////////////////////////////////////////////////////////////////

//secure password
const securePassword = async (password) => {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
};


/////////////////////////////////////////////////////////////////////////////////////////


export const authenticateAdmin = async (email, password) => {
    const admin = await Admin.findOne({ email }).lean();

    if (!admin) {
        return { success: false, error:ADMIN_AUTH_MESSAGES.ADMIN_NOT_FOUND };
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
        return { success: false, error: ADMIN_AUTH_MESSAGES.INVALID_PASSWORD };
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




export const registerAdmin = async (adminData) => {
    const { name, email, password } = adminData;

    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email }).lean();
    if (existingAdmin) {
        return { success: false, error: ADMIN_AUTH_MESSAGES.ACCOUNT_EXIST };
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