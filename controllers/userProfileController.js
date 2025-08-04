const User = require("../models/userSchema");
const Address = require(`../models/addressSchema`)
const Order = require(`../models/orderSchema`)
const Wallet = require(`../models/walletSchema`)

const crypto = require("crypto");




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
    req.session.destroy()
    const userId = res.locals.user._id
    const deleted = await User.findByIdAndDelete(userId)
    if (deleted) {
        return res.status(200).json({
            success: true,
        });
    }
}

exports.userOrders = async (req, res) => {
    const userId = res.locals.user._id

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = 2; // 2 orders per page

    try {
        // Get total count of orders
        const totalOrders = await Order.countDocuments({ userId });
        const totalPages = Math.ceil(totalOrders / limit);

        // Get paginated orders (latest first)
        const orders = await Order.find({ userId })
            .sort({ createdAt: -1 }) // Sort by newest first
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        return res.render('user/userOrders', {
            orders,
            no_user_header: true,
            pagination: {
                currentPage: page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        return res.render('user/userOrders', {
            orders: [],
            no_user_header: true,
            pagination: {
                currentPage: 1,
                limit,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false
            }
        });
    }
}; exports.userOrders = async (req, res) => {
    const userId = res.locals.user._id

    // Pagination variables
    const page = parseInt(req.query.page) || 1;
    const limit = 2; // 2 orders per page
    let orders = await Order.find({ userId }).lean();
    let totalPages = 0;

    if (orders.length > 0) {
        // Reverse orders to show latest first
        const reversedOrders = orders.reverse();

        // Calculate total pages
        totalPages = Math.ceil(reversedOrders.length / limit);

        // Get orders for current page
        const startIndex = (page - 1) * limit;
        orders = reversedOrders.slice(startIndex, startIndex + limit);
    }

    return res.render('user/userOrders', {
        orders,
        pagination: {
            page,
            limit,
            totalPages,
            nextPage: page + 1,
            prevPage: page - 1,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    });
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



exports.invoice_render = async (req, res) => {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId).lean();

    return res.render('user/order-invoice', { order, no_user_header: true })
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




