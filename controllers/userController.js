// controllers/userController.js
const authService = require("../services/userService");
const AUTH_MESSAGES = require("../constants/auth");
const STATUS_CODES = require("../constants/status-codes");

exports.homeRender = async (req, res) => {
    try {
        const userId = res.locals.user?._id || null;
        const { products, referralSettings } = await authService.getHomeData(userId);

        const showModal = !!(req.session.user && req.session.user.showWelcomeModal === true);

        return res.render("user/home", {
            product: products,
            showWelcomeModal: showModal,
            referralSettings,
        });
    } catch {
        return res.redirect(`/user/home`);
    }
};

exports.registerRender = async (req, res) => {
    if (req.session.user) return res.redirect(`/user/home`);
    return res.render("user/register", { plain_body: true });
};

exports.loginRender = async (req, res) => {
    if (req.session.user) return res.redirect(`/user/home`);
    return res.render("user/login", { plain_body: true });
};

exports.forgetPasswordRender = async (req, res) => {
    if (req.session.user) {
        if (req.query.priority) {
            return res.render("user/forgetPassword", {
                plain_body: true,
                error: req.query.error || null,
                email: req.session.user.email,
            });
        }
        return res.redirect("/user/home");
    }
    return res.render("user/forgetPassword", {
        plain_body: true,
        error: req.query.error || null,
        email: "",
    });
};

exports.userLogout = (req, res) => {
    delete req.session.user;
    req.session.save((err) => {
        if (err) return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send("Error");
        return res.redirect("/user/login");
    });
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const userSessionData = await authService.loginUser(email, password);

        req.session.user = userSessionData;
        return res.status(STATUS_CODES.OK).json({ success: true, message: AUTH_MESSAGES.LOGIN_SUCCESS });
    } catch (err) {
        const msg = err.message;
        const status = msg.includes("not found") ? STATUS_CODES.NOT_FOUND :
                       msg.includes("Invalid") || msg.includes("Try Forgot") ? STATUS_CODES.UNAUTHORIZED :
                       msg.includes("not verified") || msg.includes("blocked") ? STATUS_CODES.FORBIDDEN : STATUS_CODES.INTERNAL_SERVER_ERROR;
        return res.status(status).json({ success: false, error: msg });
    }
};

exports.register = async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;
        if (!name || !email || !password || !confirmPassword) {
            return res.render("user/register", { message: "All fields are required.", plain_body: true });
        }
        if (password !== confirmPassword) {
            return res.render("user/register", { message: "Passwords do not match.", plain_body: true });
        }

        const sessionData = await authService.registerUserProcess(name, email, password);
        req.session.unknown_user = sessionData;

        return res.redirect("/user/emailverification");
    } catch (err) {
        return res.render("user/register", { message: err.message || "Something went wrong. Please try again.", plain_body: true });
    }
};

exports.emailVerificationRender = (req, res) => {
    const sessionUser = req.session.unknown_user;
    if (!sessionUser) return res.redirect("/user/register");

    return res.render("user/emailVerification", {
        plain_body: true,
        verificationTimer: sessionUser.otpExpiresAt,
        resendTimer: sessionUser.resendAvailableAt
    });
};

exports.resendEmailVerification = async (req, res) => {
    try {
        const sessionUser = req.session.unknown_user;
        if (!sessionUser?._id) {
            return res.status(STATUS_CODES.UNAUTHORIZED).json({ success: false, error: "Session expired. Please register again." });
        }

        const timers = await authService.resendEmailVerificationProcess(sessionUser);

        req.session.unknown_user.otpExpiresAt = timers.otpExpiresAt;
        req.session.unknown_user.resendTimer = timers.resendTimer;

        return res.status(STATUS_CODES.OK).json({
            success: true,
            message: "Verification code sent successfully.",
            verificationTimer: timers.otpExpiresAt,
            resendTimer: timers.resendTimer
        });
    } catch (err) {
        const status = err.message.includes("limit") || err.message.includes("wait") ? STATUS_CODES.TOO_MANY_REQUESTS :
                       err.message.includes("not found") ? STATUS_CODES.NOT_FOUND : STATUS_CODES.UNAUTHORIZED;
        return res.status(status).json({ success: false, error: err.message });
    }
};

exports.emailVerification = async (req, res) => {
    try {
        const { verificationCode } = req.body;
        const sessionUser = req.session.unknown_user;

        if (!sessionUser?._id) {
            return res.status(STATUS_CODES.UNAUTHORIZED).json({ success: false, error: "Session expired. Please register again." });
        }
        if (!verificationCode) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, error: "Please enter the verification code." });
        }

        const user = await authService.verifyEmailOtpProcess(sessionUser._id, verificationCode);

        req.session.user = {
            _id: user._id,
            name: user.name,
            email: user.email,
            blocked: user.blocked,
            showWelcomeModal: true,
        };
        delete req.session.unknown_user;

        return res.status(STATUS_CODES.OK).json({ success: true, message: AUTH_MESSAGES.EMAIL_VERIFIED });
    } catch (err) {
        delete req.session.unknown_user;
        const msg = err.message;
        const status = msg.includes("expired") ? STATUS_CODES.GONE :
                       msg.includes("limit") ? STATUS_CODES.TOO_MANY_REQUESTS :
                       msg.includes("Invalid") ? STATUS_CODES.UNAUTHORIZED :
                       msg.includes("not found") ? STATUS_CODES.NOT_FOUND : STATUS_CODES.BAD_REQUEST;
        return res.status(status).json({ success: false, error: msg });
    }
};

exports.forgetPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const sessionData = await authService.forgetPasswordProcess(email);

        req.session.forgot_password = sessionData;

        return res.status(STATUS_CODES.OK).json({
            success: true,
            message: "Verification code sent successfully.",
            verificationTimer: sessionData.otpExpiresAt,
            resendTimer: sessionData.resendAvailableAt,
        });
    } catch (err) {
        const msg = err.message;
        const status = msg.includes("limit") || msg.includes("wait") ? STATUS_CODES.TOO_MANY_REQUESTS :
                       msg.includes("No account") ? STATUS_CODES.NOT_FOUND : STATUS_CODES.BAD_REQUEST;
        return res.status(status).json({ success: false, error: msg });
    }
};

exports.resetPasswordRender = async (req, res) => {
    try {
        const otp = req.params.token;
        if (!otp) return res.redirect("/user/forgetPassword?priority=true&&error=invalidLink");

        const forgotPasswordSession = req.session.forgot_password;
        if (!forgotPasswordSession?._id) return res.redirect("/user/forgetPassword?priority=true&&error=sessionExpired");

        await authService.validateResetPasswordTokenProcess(forgotPasswordSession._id, otp);

        return res.render("user/resetPassword", { plain_body: true });
    } catch (err) {
        delete req.session.forgot_password;
        return res.redirect(`/user/forgetPassword?priority=true&&error=${err.message || "serverError"}`);
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;
        const forgotPasswordSession = req.session.forgot_password;

        if (!forgotPasswordSession?._id) {
            return res.status(STATUS_CODES.UNAUTHORIZED).json({ success: false, error: "Password reset session has expired." });
        }

        await authService.resetPasswordProcess(forgotPasswordSession._id, newPassword, confirmPassword);

        delete req.session.forgot_password;
        return res.status(STATUS_CODES.OK).json({ success: true, message: AUTH_MESSAGES.PASSWORD_RESET_SUCCESS });
    } catch (err) {
        const status = err.message.includes("User not found") ? STATUS_CODES.NOT_FOUND : STATUS_CODES.BAD_REQUEST;
        return res.status(status).json({ success: false, error: err.message });
    }
};

exports.showUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const query = req.query.query || "";
        const accountStatus = req.query.accountStatus || "";

        const { user, pagination } = await authService.fetchPaginatedUsers(query, accountStatus, page);

        return res.render("admin/usersList", {
            admin: true,
            user,
            query,
            accountStatus,
            pagination
        });
    } catch {
        return res.render("admin/usersList", {
            admin: true,
            user: [],
            query: "",
            accountStatus: "",
            pagination: { page: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false, nextPage: 2, prevPage: 0, serialNumberStart: 0 },
            errorMessage: "Error fetching users."
        });
    }
};

exports.blockUser = async (req, res) => {
    try {
        const userId = req.params.id;
        if (!userId) return res.status(STATUS_CODES.NOT_FOUND).json({ message: AUTH_MESSAGES.USER_NOT_FOUND });

        await authService.toggleUserBlockStatus(userId);

        const referer = req.get('Referer') || req.get('referrer') || '/admin/users';
        return res.redirect(referer);
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ message: "Internal Server Error" });
    }
};

exports.verifyPassword = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) return res.status(STATUS_CODES.UNAUTHORIZED).json({ message: AUTH_MESSAGES.INVALID_PASSWORD });

        const userId = res.locals.user._id;
        await authService.verifyUserPasswordProcess(userId, password);

        return res.json({ success: true, message: 'Password Verified Successfully' });
    } catch (err) {
        const status = err.message.includes("incorrect") || err.message.includes("Google") ? STATUS_CODES.UNAUTHORIZED : STATUS_CODES.INTERNAL_SERVER_ERROR;
        return res.status(status).json({ message: err.message || "Password is Not Verified" });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const userId = res.locals.user._id;

        await authService.verifyEmailChangeProcess(userId, email);

        return res.status(STATUS_CODES.OK).json({
            success: true,
            message: 'Verification code sent to your email inbox successfully.'
        });
    } catch (err) {
        const status = err.message.includes("valid") ? STATUS_CODES.BAD_REQUEST :
                       err.message.includes("Exceeded") ? STATUS_CODES.BAD_REQUEST :
                       err.message.includes("already registered") ? STATUS_CODES.CONFLICT : STATUS_CODES.INTERNAL_SERVER_ERROR;
        return res.status(status).json({ success: false, message: err.message || "Email is not Verified" });
    }
};

exports.resetEmail = async (req, res) => {
    try {
        const { otp, email } = req.body;
        const userId = res.locals.user._id;

        await authService.resetEmailProcess(userId, email, otp);

        return res.status(STATUS_CODES.OK).json({ success: true, message: "Email updated successfully!" });
    } catch (err) {
        const msg = err.message;
        const status = msg.includes("valid") || msg.includes("No OTP") ? STATUS_CODES.BAD_REQUEST :
                       msg.includes("timed out") ? STATUS_CODES.GONE :
                       msg.includes("Maximum OTP") ? STATUS_CODES.TOO_MANY_REQUESTS :
                       msg.includes("Invalid OTP") ? STATUS_CODES.UNAUTHORIZED : STATUS_CODES.INTERNAL_SERVER_ERROR;
        return res.status(status).json({ success: false, message: msg });
    }
};