const userService = require("../services/userProfileService");

// Profile Renders
exports.profileRender = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const { userData, address } = await userService.fetchUserProfile(userId);
        return res.render(`user/profile`, { userData, address, user_sidebar: true });
    } catch {
        return res.status(500).send("Internal Server Error");
    }
};

exports.securityRender = async (req, res) => {
    try {
        const hasPassword = await userService.checkUserHasPassword(res.locals.user._id);
        return res.render("user/security", {
            user_sidebar: true,
            hasPassword
        });
    } catch {
        return res.redirect("/user/profile");
    }
};

exports.profileEdit = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        await userService.updateUserData(userId, req.body);
        return res.status(200).json({
            success: true,
            message: "Profile updated successfully.",
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Something went wrong. Please try again.",
        });
    }
};

exports.deleteUserRender = async (req, res) => {
    return res.render(`user/deleteAccount`, { user_sidebar: true });
};

exports.deleteUser = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        await userService.deactivateUserAccount(userId);

        delete req.session.user;

        req.session.save((err) => {
            if (err) {
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
    } catch (error) {
        const statusCode = error.message === "User not found" ? 404 : 500;
        return res.status(statusCode).json({ success: false, message: error.message || "Server Error" });
    }
};

// Address Renders & Actions
exports.addressRender = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const addresses = await userService.fetchUserAddresses(userId);
        return res.render('user/address', { addresses, user_sidebar: true });
    } catch {
        return res.status(500).send('Internal Server Error');
    }
};

exports.addAddressRender = async (req, res) => {
    return res.render(`user/addAddress`, { user_sidebar: true });
};

exports.editAddressRender = async (req, res) => {
    try {
        const address = await userService.fetchSingleAddress(req.params.id);
        return res.render(`user/editAddress`, { address, user_sidebar: true });
    } catch {
        return res.status(500).send('Internal Server Error');
    }
};

exports.addAddress = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const addresses = await userService.createNewAddress(userId, req.body);
        return res.render('user/address', { addresses, user_sidebar: true });
    } catch {
        return res.status(500).json({ message: 'Server error' });
    }
};

exports.editAddress = async (req, res) => {
    try {
        await userService.updateExistingAddress(req.params.id, req.body);
        return res.redirect('back');
    } catch {
        return res.status(500).send('Server Error');
    }
};

exports.setDefaultAddress = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        await userService.setDefaultAddress(userId, req.params.id);
        return res.redirect('/user/address');
    } catch {
        return res.status(500).send('Server error');
    }
};

exports.deleteAddress = async (req, res) => {
    try {
        await userService.removeAddress(req.params.id);
        return res.redirect(`/user/address`);
    } catch {
        return res.status(500).send('Server Error');
    }
};

// Order Renders
exports.userOrders = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const { orders, isRetryPendingOrder, pagination } = await userService.fetchUserOrders(userId, req.query);
        const viewName = isRetryPendingOrder ? 'user/userPendingOrders' : 'user/userOrders';

        return res.render(viewName, {
            orders,
            isRetryPendingOrder,
            pagination,
            user_sidebar: true
        });
    } catch {
        return res.render('user/userOrders', {
            orders: [],
            isRetryPendingOrder: false,
            pagination: { page: 1, limit: 2, totalPages: 1, hasNextPage: false, hasPrevPage: false, nextPage: 1, prevPage: 1 },
            user_sidebar: true,
        });
    }
};

exports.userOrderDetails = async (req, res) => {
    try {
        const order = await userService.fetchOrderDetails(req.params.orderId);
        return res.render(`user/orderDetails`, { order, user_sidebar: true });
    } catch {
        return res.status(500).send('Server Error');
    }
};