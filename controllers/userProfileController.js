const User = require("../models/userSchema");
const Address = require(`../models/addressSchema`)
const Order = require(`../models/orderSchema`)
const Wallet = require(`../models/walletSchema`)

const crypto = require("crypto");

//MESSAGE_CONSTANTS
const MESSAGES = require(`../utils/constants`)

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////




//profile page
exports.profileRender = async (req, res) => {
    const userId = res.locals.user._id
    const userData = await User.findById(userId).lean()
    const address = await Address.findOne({ userId: userId, isDefault: true }).lean();
    return res.render(`user/profile`, { userData: userData, address: address, user_sidebar: true })
}


exports.addressRender = async (req, res) => {
    try {
        const userId = res.locals.user._id
        const addresses = await Address.find({ userId }).lean();
        return res.render('user/address', { addresses: addresses, user_sidebar: true });
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
    }
}

exports.editAddressRender = async (req, res) => {
    const addressId = req.params.id
    const address = await Address.findById(addressId).lean()
    return res.render(`user/editAddress`, { address: address, user_sidebar: true })
}



exports.securityRender = async (req, res) => {
  try {

    const hasPassword = !!(
      await User.findById(res.locals.user._id)
        .select("password")
        .lean()
    )?.password;

    return res.render("user/security", {
      user_sidebar: true,
      hasPassword
    });

  } catch (error) {
    console.error("Security Render Error:", error);
    return res.redirect("/user/profile");
  }
};




exports.profileEdit = async (req, res) => {
    try {
        let { name, phone, gender, dob } = req.body;
        const userId = res.locals.user._id;
        // SANITIZE
        name = name?.trim();
        phone = phone?.trim();
        gender = gender?.trim();
        // NAME
        const nameRegex = /^[A-Za-z]+(?:\s[A-Za-z]+)*$/;
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Name is required.",
            });
        }
        if (name.length < 3 || name.length > 50) {
            return res.status(400).json({
                success: false,
                message: "Name must be between 3 and 50 characters.",
            });
        }
        if (!nameRegex.test(name)) {
            return res.status(400).json({
                success: false,
                message: "Name can contain only letters and single spaces.",
            });
        }
        // PHONE
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                success: false,
                message: "Invalid mobile number.",
            });
        }
        // GENDER
        const allowedGenders = ["Male", "Female", "Other"];
        if (!allowedGenders.includes(gender)) {
            return res.status(400).json({
                success: false,
                message: "Invalid gender selected.",
            });
        }
        // DOB
        if (!dob) {
            return res.status(400).json({
                success: false,
                message: "Date of birth is required.",
            });
        }
        const dobDate = new Date(dob);
        if (isNaN(dobDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid date of birth.",
            });
        }
        const today = new Date();
        if (dobDate > today) {
            return res.status(400).json({
                success: false,
                message: "Date of birth cannot be in the future.",
            });
        }
        let age = today.getFullYear() - dobDate.getFullYear();
        const monthDiff = today.getMonth() - dobDate.getMonth();
        if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < dobDate.getDate())
        ) {
            age--;
        }
        if (age < 13) {
            return res.status(400).json({
                success: false,
                message: "Minimum age is 13 years.",
            });
        }
        if (age > 120) {
            return res.status(400).json({
                success: false,
                message: "Invalid date of birth.",
            });
        }
        // UPDATE
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                name,
                phone,
                gender,
                dateOfBirth: dob,
            },
            {
                new: true,
                runValidators: true,
            },
        );
        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Profile updated successfully.",
        });
    } catch (error) {
        console.error("Profile Edit Error:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again.",
        });
    }
};





exports.setDefaultAddress = async (req, res) => {
    const addressId = req.params.id;
    const userId = res.locals.user._id

    try {

        await Address.updateMany(
            { userId: userId },
            { $set: { isDefault: false } }
        );


        await Address.findByIdAndUpdate(
            addressId,
            { $set: { isDefault: true } },
            { new: true }
        );

        return res.redirect('/user/address');
    } catch (error) {
        console.error("Error setting default address:", error);
        return res.status(500).send('Server error');
    }
};
exports.deleteAddress = async (req, res) => {
    const addressId = req.params.id
    await Address.findByIdAndDelete(addressId).lean()
    return res.redirect(`/user/address`)
}

exports.editAddress = async (req, res) => {
    const addressId = req.params.id;
    const { name, streetAddress, landmark, city, state, zip, country, phone } = req.body;

    try {
        await Address.findByIdAndUpdate(addressId, {
            name,
            streetAddress,
            landmark,
            city,
            state,
            zip,
            country,
            phone
        });
        return res.redirect('back');
    } catch (error) {
        console.error("Error updating address:", error);
        return res.status(500).send('Server Error');

    }
}


exports.addAddressRender = async (req, res) => {
    return res.render(`user/addAddress`, { user_sidebar: true })
}

exports.deleteUserRender = async (req, res) => {
    return res.render(`user/deleteAccount`, { user_sidebar: true })
}

exports.deleteUser = async (req, res) => {
    try {
        const userId = res.locals.user._id;

        // Use updateOne to flip the isActive flag
        const result = await User.updateOne(
            { _id: userId },
            { $set: { isActive: false } }
        );

        if (result.modifiedCount > 0) {


            delete req.session.user;

            req.session.save((err) => {
                if (err) {
                    console.error(" Failed to save session after removing user:", err);
                    return res.status(500).json({
                        success: false,
                        message: "Internal Server Error during deactivation"
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: "User account session cleared successfully"
                });
            });

        } else {
            res.status(404).json({ success: false, message: "User not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};



exports.userOrders = async (req, res) => {
    const userId = res.locals.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = 2;

    try {
        const isRetryPendingOrder = req.query.retryPendingOrder === 'true';
        const currentTime = new Date();

        let totalOrders = 0;
        let orders = [];

        if (isRetryPendingOrder) {
            // POOL 1: Only failed orders where RETRY IS ELIGIBLE (Both conditions must be healthy)
            const eligibleQuery = {
                userId,
                paymentStatus: "Failed",
                paymentRetryExpiresAt: { $gt: currentTime }, // Must not be expired yet
                paymentAttemptsCount: { $lt: 6 }             // Must have attempts remaining
            };

            totalOrders = await Order.countDocuments(eligibleQuery);
            orders = await Order.find(eligibleQuery)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean();

        } else {
            // POOL 2: Every order that is completed, pending, OR failed but retry limits exceeded
            const regularPoolQuery = {
                userId,
                $or: [
                    { paymentStatus: { $in: ['Completed', 'Pending', 'Refunded'] } },
                    {
                        paymentStatus: "Failed",
                        $or: [
                            { paymentRetryExpiresAt: { $lte: currentTime } }, // Limit 1 exceeded: Time up
                            { paymentAttemptsCount: { $gte: 6 } }             // Limit 2 exceeded: Max attempts
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
        const viewName = isRetryPendingOrder ? 'user/userPendingOrders' : 'user/userOrders';

        return res.render(viewName, {
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
            },
            user_sidebar: true
        });

    } catch (error) {
        console.error('Error fetching orders:', error);
        return res.render('user/userOrders', {
            orders: [],
            isRetryPendingOrder: false,
            pagination: { page: 1, limit, totalPages: 1, hasNextPage: false, hasPrevPage: false, nextPage: 1, prevPage: 1 },
            user_sidebar: true,
        });
    }
};






exports.userOrderDetails = async (req, res) => {

    const orderId = req.params.orderId;

    const order = await Order.findById(orderId).lean();

    return res.render(`user/orderDetails`, { order: order, user_sidebar: true })
}






exports.addAddress = async (req, res) => {
    try {
        const { streetAddress, landmark, city, state, zip, country, phone, name } = req.body;
        const userId = res.locals.user._id
        console.log(userId, "this is userId")
        const addresses = await Address.find({ userId: userId }).lean()

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
            isDefault: isFirstAddress || isFirstAddress
        });

        await newAddress.save();
        const address = await Address.find({ userId: userId }).lean()

        return res.render('user/address', { addresses: address, user_sidebar: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
}




