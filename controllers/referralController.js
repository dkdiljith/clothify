import referralService from '../services/referralService.js';
import Referral from '../models/referralSchema.js';


import REFERRAL_MESSAGES from '../constants/referral.js';
import STATUS_CODES from '../constants/status-codes.js';
import COMMON_MESSAGES from '../constants/common-messages.js';



exports.referral = async (req, res) => {
    try {
        const userId = res.locals.user?._id;
        if (!userId) {
            return res.status(STATUS_CODES.UNAUTHORIZED).render("/user/home", { message: COMMON_MESSAGES.UNAUTHORIZED_ACCESS});
        }

        const data = await referralService.getReferralDashboardData(userId, req.query);

        return res.render("user/referral", {
            ...data,
            user_sidebar: true,
        });
    } catch (error) {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: error.message || REFERRAL_MESSAGES.FAILED_RENDER,
        });
    }
};

exports.applyReferral = async (req, res) => {
    try {
        const { referralCode } = req.body;
        const userId = res.locals.user._id;
        const { signupBonus } = await referralService.getReferralSettings();

        const result = await referralService.applyReferralCode(userId, referralCode);

        if (req.session?.user) {
            req.session.user.showWelcomeModal = false;
        }

        return res.status(STATUS_CODES.OK).json({
            success: true,
            message: REFERRAL_MESSAGES.REFERRAL_APPLIED_SUCCCESS,
            signupBonus,
            referralBonus: result.referralBonus,
            rewardCoins: result.rewardCoins,
            rewardValue: result.rewardValue,
            referralApplied: true,
        });
    } catch (error) {
        const statusCode = error.message.includes("not found") || error.message.includes("Invalid") ? 404 : 400;
        return res.status(statusCode === 404 ? STATUS_CODES.NOT_FOUND : STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || REFERRAL_MESSAGES.FAILED_APPLY_REFERRAL,
        });
    }
};

exports.cancelReferral = async (req, res) => {
    try {
        const { signupBonus, coinValue } = await referralService.getReferralSettings();
        const userId = res.locals.user._id;
        
        const referral = await Referral.findOne({ userId }).lean();

        if (req.session?.user) {
            req.session.user.showWelcomeModal = false;
        }

        return res.status(STATUS_CODES.OK).json({
            success: true,
            signupBonus,
            referralBonus: 0,
            rewardCoins: referral?.referralCoins || 0,
            rewardValue: (referral?.referralCoins || 0) * Number(coinValue),
            referralApplied: false,
        });
    } catch {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: REFERRAL_MESSAGES.FAILED_CANCEL_REFERRAL,
        }); 
    }
};

exports.redeemCoin = async (req, res) => {
    try {
        const userId = res.locals.user._id;
        const result = await referralService.redeemUserCoins(userId, req.body.reedeemCoinInput);

        return res.status(STATUS_CODES.OK).json({
            success: true,
            message: REFERRAL_MESSAGES.REDEEM_COINS,
            newWalletBalance: result.newWalletBalance,
            newBalance: result.newBalance,
            history: result.history
        });
    } catch (error) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: error.message || REFERRAL_MESSAGES.FAILED_REDEEM_COINS,
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