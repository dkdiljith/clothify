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
    return res.render(`user/profileView`, { userData: userData, address: address })
}

exports.profileEditRender = async (req, res) => {
    const userId = res.locals.user._id
    const userData = await User.findById(userId).lean()
    return res.render(`user/profileEdit`, { userData: userData, })
}

exports.addressRender = async (req, res) => {
    try {
        const userId = res.locals.user._id
        const addresses = await Address.find({ userId }).lean();
        return res.render('user/address', { addresses: addresses, });
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
    }
}

exports.editAddressRender = async (req, res) => {
    const addressId = req.params.id
    const address = await Address.findById(addressId).lean()
    return res.render(`user/editAddress`, { address: address })
}



exports.securityRender = async (req, res) => {
    const userId = res.locals.user._id
    const user = await User.findOne({ _id: userId })

    const now = Date.now();

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(now + 3600000); // 1 hour

    // Update user
    user.resetToken = token;
    user.resetTokenExpires = tokenExpires;
    await user.save();

    const user1 = await User.findOne({ _id: userId })

    return res.render(`user/security`, { token, user: user1 })
}




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
    return res.render(`user/addAddress`,)
}

exports.deleteUserRender = async (req, res) => {
    return res.render(`user/deleteAccount`)
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
                $or: [
                    { paymentRetryExpiresAt: { $gt: currentTime } }, // Limit 1 exceeded: Time up
                    { paymentAttemptsCount: { $lt: 6 } }             // Limit 2 exceeded: Max attempts
                ]
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
            }
        });

    } catch (error) {
        console.error('Error fetching orders:', error);
        return res.render('user/userOrders', {
            orders: [],
            isRetryPendingOrder: false,
            pagination: { page: 1, limit, totalPages: 1, hasNextPage: false, hasPrevPage: false, nextPage: 1, prevPage: 1 }
        });
    }
};






exports.userOrderDetails = async (req, res) => {

    const orderId = req.params.orderId;
    const itemId = req.params.itemId;

    const order = await Order.findById(orderId).lean();

    const item = await order.items.find((item) =>
        item._id.toString() === itemId
    )


    return res.render(`user/orderDetails`, { order: order, item: item })
}






exports.profileEdit = async (req, res) => {

    try {
        const { name, phone, gender, dateOfBirth } = req.body;
        const userId = res.locals.user._id

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                name,
                phone,
                gender,
                dateOfBirth,
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        const user = await User.findById(userId).lean()

        return res.render('user/profileView', { userData: user, });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
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

        return res.render('user/address', { addresses: address });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
}




