// controllers/userProfileController.js
import userService from '../services/userProfileService.js';
import PROFILE_MESSAGES from '../constants/profile.js';
import STATUS_CODES from '../constants/status-codes.js';


// Profile Renders
exports.profileRender = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const { userData, address } = await userService.fetchUserProfile(userId);
        return res.status(STATUS_CODES.OK).render(`user/profile`, { userData, address, user_sidebar: true });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(PROFILE_MESSAGES.INTERNAL_SERVER_ERROR);
    }
};

exports.securityRender = async (req, res) => {
    try {
        const hasPassword = await userService.checkUserHasPassword(res.locals.user._id);
        return res.status(STATUS_CODES.OK).render("user/security", {
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
        return res.status(STATUS_CODES.OK).json({
            success: true,
            message: PROFILE_MESSAGES.PROFILE_UPDATED_SUCCESS,
        });
    } catch (error) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: error.message,
        });
    }
};

exports.deleteUserRender = async (req, res) => {
    return res.status(STATUS_CODES.OK).render(`user/deleteAccount`, { user_sidebar: true });
};

exports.deleteUser = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        await userService.deactivateUserAccount(userId);

        delete req.session.user;

        req.session.save((err) => {
            if (err) {
                return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
                    success: false,
                    message: PROFILE_MESSAGES.DEACTIVATION_SERVER_ERROR
                });
            }
            return res.status(STATUS_CODES.OK).json({
                success: true,
                message: PROFILE_MESSAGES.SESSION_CLEARED_SUCCESS
            });
        });
    } catch (error) {
        const statusCode = error.message === PROFILE_MESSAGES.USER_NOT_FOUND ? STATUS_CODES.NOT_FOUND : STATUS_CODES.INTERNAL_SERVER_ERROR;
        return res.status(statusCode).json({ success: false, message: error.message });
    }
};

// Address Renders & Actions
exports.addressRender = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const addresses = await userService.fetchUserAddresses(userId);
        return res.status(STATUS_CODES.OK).render('user/address', { addresses, user_sidebar: true });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(PROFILE_MESSAGES.INTERNAL_SERVER_ERROR);
    }
};

exports.addAddressRender = async (req, res) => {
    return res.status(STATUS_CODES.OK).render(`user/addAddress`, { user_sidebar: true });
};

exports.editAddressRender = async (req, res) => {
    try {
        const address = await userService.fetchSingleAddress(req.params.id);
        return res.status(STATUS_CODES.OK).render(`user/editAddress`, { address, user_sidebar: true });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(PROFILE_MESSAGES.INTERNAL_SERVER_ERROR);
    }
};

exports.addAddress = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const addresses = await userService.createNewAddress(userId, req.body);
        return res.status(STATUS_CODES.OK).render('user/address', { addresses, user_sidebar: true });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: PROFILE_MESSAGES.SERVER_ERROR });
    }
};

exports.editAddress = async (req, res) => {
    try {
        await userService.updateExistingAddress(req.params.id, req.body);
        return res.redirect('back');
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(PROFILE_MESSAGES.SERVER_ERROR);
    }
};

exports.setDefaultAddress = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        await userService.setDefaultAddress(userId, req.params.id);
        return res.redirect('/user/address');
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(PROFILE_MESSAGES.SERVER_ERROR);
    }
};

exports.deleteAddress = async (req, res) => {
    try {
        await userService.removeAddress(req.params.id);
        return res.redirect(`/user/address`);
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(PROFILE_MESSAGES.SERVER_ERROR);
    }
};

// Order Renders
exports.userOrders = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const { orders, isRetryPendingOrder, pagination } = await userService.fetchUserOrders(userId, req.query);
        const viewName = isRetryPendingOrder ? 'user/userPendingOrders' : 'user/userOrders';

        return res.status(STATUS_CODES.OK).render(viewName, {
            orders,
            isRetryPendingOrder,
            pagination,
            user_sidebar: true
        });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).render('user/userOrders', {
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
        return res.status(STATUS_CODES.OK).render(`user/orderDetails`, { order, user_sidebar: true });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(PROFILE_MESSAGES.SERVER_ERROR);
    }
};