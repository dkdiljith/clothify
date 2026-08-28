// services/userProfileService.js
import User from '../models/userSchema.js';
import Address from '../models/addressSchema.js';
import Order from '../models/orderSchema.js';
import PROFILE_MESSAGES from '../constants/profile.js';

// --- Profile Services ---

async function fetchUserProfile(userId) {
    const userData = await User.findById(userId).lean();
    const address = await Address.findOne({ userId: userId, isDefault: true }).lean();
    return { userData, address };
}

async function updateUserData(userId, body) {
    let { name, phone, gender, dob } = body;
    
    name = name?.trim();
    phone = phone?.trim();
    gender = gender?.trim();

    // Validations
    const nameRegex = /^[A-Za-z]+(?:\s[A-Za-z]+)*$/;
    if (!name) throw new Error(PROFILE_MESSAGES.NAME_REQUIRED);
    if (name.length < 3 || name.length > 50) throw new Error(PROFILE_MESSAGES.NAME_LENGTH_INVALID);
    if (!nameRegex.test(name)) throw new Error(PROFILE_MESSAGES.NAME_FORMAT_INVALID);

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) throw new Error(PROFILE_MESSAGES.INVALID_PHONE);

    const allowedGenders = ["Male", "Female", "Other"];
    if (!allowedGenders.includes(gender)) throw new Error(PROFILE_MESSAGES.INVALID_GENDER);

    if (!dob) throw new Error(PROFILE_MESSAGES.DOB_REQUIRED);
    const dobDate = new Date(dob);
    if (isNaN(dobDate.getTime())) throw new Error(PROFILE_MESSAGES.INVALID_DOB);
    
    const today = new Date();
    if (dobDate > today) throw new Error(PROFILE_MESSAGES.DOB_FUTURE_ERROR);

    let age = today.getFullYear() - dobDate.getFullYear();
    const monthDiff = today.getMonth() - dobDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
        age--;
    }
    if (age < 13) throw new Error(PROFILE_MESSAGES.MIN_AGE_ERROR);
    if (age > 120) throw new Error(PROFILE_MESSAGES.INVALID_DOB);

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { name, phone, gender, dateOfBirth: dob },
        { new: true, runValidators: true }
    );

    if (!updatedUser) throw new Error(PROFILE_MESSAGES.USER_NOT_FOUND);
    return updatedUser;
}

async function checkUserHasPassword(userId) {
    const user = await User.findById(userId).select("password").lean();
    return !!user?.password;
}

async function deactivateUserAccount(userId) {
    const result = await User.updateOne({ _id: userId }, { $set: { isActive: false } });
    if (result.modifiedCount === 0) {
        throw new Error(PROFILE_MESSAGES.USER_NOT_FOUND);
    }
    return true;
}

// --- Address Services ---

async function fetchUserAddresses(userId) {
    return await Address.find({ userId }).lean();
}

async function fetchSingleAddress(addressId) {
    return await Address.findById(addressId).lean();
}

async function createNewAddress(userId, body) {
    const { streetAddress, landmark, city, state, zip, country, phone, name } = body;
    const addresses = await Address.find({ userId }).lean();

    const isFirstAddress = addresses.length === 0;
    const newAddress = new Address({
        userId,
        name,
        streetAddress,
        landmark,
        city,
        state,
        zip,
        country,
        phone,
        isDefault: isFirstAddress
    });

    await newAddress.save();
    return await Address.find({ userId }).lean();
}

async function updateExistingAddress(addressId, body) {
    const { name, streetAddress, landmark, city, state, zip, country, phone } = body;
    return await Address.findByIdAndUpdate(addressId, {
        name, streetAddress, landmark, city, state, zip, country, phone
    });
}

async function setDefaultAddress(userId, addressId) {
    await Address.updateMany({ userId }, { $set: { isDefault: false } });
    return await Address.findByIdAndUpdate(addressId, { $set: { isDefault: true } }, { new: true });
}

async function removeAddress(addressId) {
    return await Address.findByIdAndDelete(addressId).lean();
}

// --- Order Services ---

async function fetchUserOrders(userId, queryParams) {
    const page = parseInt(queryParams.page) || 1;
    const limit = 2;
    const isRetryPendingOrder = queryParams.retryPendingOrder === 'true';
    const currentTime = new Date();

    let totalOrders;
    let orders;

    if (isRetryPendingOrder) {
        const eligibleQuery = {
            userId,
            paymentStatus: "Failed",
            paymentRetryExpiresAt: { $gt: currentTime },
            paymentAttemptsCount: { $lt: 6 }
        };

        totalOrders = await Order.countDocuments(eligibleQuery);
        orders = await Order.find(eligibleQuery)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
    } else {
        const regularPoolQuery = {
            userId,
            $or: [
                { paymentStatus: { $in: ['Completed', 'Pending', 'Refunded'] } },
                {
                    paymentStatus: "Failed",
                    $or: [
                        { paymentRetryExpiresAt: { $lte: currentTime } },
                        { paymentAttemptsCount: { $gte: 6 } }
                    ]
                }
            ]
        };

        totalOrders = await Order.countDocuments(regularPoolQuery);
        orders = await Order.find(regularPoolQuery)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
    }

    const totalPages = Math.ceil(totalOrders / limit) || 1;
    return {
        orders,
        isRetryPendingOrder,
        pagination: {
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1
        }
    };
}

async function fetchOrderDetails(orderId) {
    return await Order.findById(orderId).lean();
}

module.exports = {
    fetchUserProfile,
    updateUserData,
    checkUserHasPassword,
    deactivateUserAccount,
    fetchUserAddresses,
    fetchSingleAddress,
    createNewAddress,
    updateExistingAddress,
    setDefaultAddress,
    removeAddress,
    fetchUserOrders,
    fetchOrderDetails
};