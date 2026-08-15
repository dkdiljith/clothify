const referralService = require("../services/referralService");

exports.referral = async (req, res) => {
    try {
        const userId = res.locals.user?._id;
        if (!userId) {
            return res.status(401).render("error/401", { message: "Unauthorized access." });
        }

        const data = await referralService.getReferralDashboardData(userId, req.query);

        return res.render("user/referral", {
            ...data,
            user_sidebar: true,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message || "Referral Controller Error",
        });
    }
};

exports.applyReferral = async (req, res) => {
    try {
        const { referralCode } = req.body;
        const userId = res.locals.user._id;
        const { signupBonus, coinValue } = await referralService.getReferralSettings();

        const result = await referralService.applyReferralCode(userId, referralCode);

        if (req.session?.user) {
            req.session.user.showWelcomeModal = false;
        }

        return res.status(200).json({
            success: true,
            message: "Referral code applied successfully!",
            signupBonus,
            referralBonus: result.referralBonus,
            rewardCoins: result.rewardCoins,
            rewardValue: result.rewardValue,
            referralApplied: true,
        });
    } catch (error) {
        const statusCode = error.message.includes("not found") || error.message.includes("Invalid") ? 404 : 400;
        return res.status(statusCode === 404 ? 404 : 400).json({
            success: false,
            message: error.message || "Referral Controller Error",
        });
    }
};

exports.cancelReferral = async (req, res) => {
    try {
        const { signupBonus, coinValue } = await referralService.getReferralSettings();
        const userId = res.locals.user._id;
        
        const Referral = require("../models/referralSchema");
        const referral = await Referral.findOne({ userId }).lean();

        if (req.session?.user) {
            req.session.user.showWelcomeModal = false;
        }

        return res.status(200).json({
            success: true,
            signupBonus,
            referralBonus: 0,
            rewardCoins: referral?.referralCoins || 0,
            rewardValue: (referral?.referralCoins || 0) * Number(coinValue),
            referralApplied: false,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Unable to dismiss referral popup.",
        });
    }
};

exports.redeemCoin = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const result = await referralService.redeemUserCoins(userId, req.body.reedeemCoinInput);

        return res.status(200).json({
            success: true,
            message: `Successfully redeemed coins for ₹${result.redeemAmount.toFixed(2)}!`,
            newWalletBalance: result.newWalletBalance,
            newBalance: result.newBalance,
            history: result.history
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "An internal server error occurred while redeeming coins.",
        });
    }
};

// Exported standalone utility methods utilized elsewhere (e.g., auth service or cron job)
exports.createReferral = async (userId, session = null) => {
    try {
        return await referralService.createNewReferralRecord(userId, session);
    } catch {
        return {};
    }
};

exports.processPendingReferralsCron = async () => {
    return await referralService.processCronPendingReferrals();
};