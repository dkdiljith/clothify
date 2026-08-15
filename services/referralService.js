 const User = require("../models/userSchema");
const Wallet = require("../models/walletSchema");
const Order = require("../models/orderSchema");
const Referral = require("../models/referralSchema");
const ReferralHistory = require("../models/referralHistorySchema"); 
const Setting = require("../models/settingSchema");

const DEFAULT_REFERRAL_SETTINGS = {
    coinValue: "0.010",
    referrerReward: 300,
    refereeReward: 500,
    signupBonus: 1000,
    referralHoldingPeriodDays: 7, // Safe default fallback
};

async function getReferralSettings() {
    const result = await Setting.findOne().select("referralSettings").lean();
    return { ...DEFAULT_REFERRAL_SETTINGS, ...(result?.referralSettings || {}) };
}

async function getReferralDashboardData(userId, query) {
    const settings = await getReferralSettings();
    const referralPage = parseInt(query.referralPage) || 1;
    const coinPage = parseInt(query.coinPage) || 1;
    const referralLimit = 5;
    const coinLimit = 5;

    const referralSkip = (referralPage - 1) * referralLimit;
    const coinSkip = (coinPage - 1) * coinLimit;

    const [rawUser, userReferralRecord] = await Promise.all([
        User.findById(userId).lean(),
        Referral.findOne({ userId }).lean(),
    ]);

    if (!rawUser) throw new Error("User profile not found.");

    const user = {
        ...rawUser,
        referralCode: userReferralRecord?.referralCode || null,
        referralCoins: userReferralRecord?.referralCoins || 0,
    };

    const [
        totalReferralDocuments,
        totalCoinDocuments,
        successfulReferralCount,
        completedOrders,
        referrals,
        coinHistory
    ] = await Promise.all([
        Referral.countDocuments({ referrer: userId }),
        ReferralHistory.countDocuments({ userId }),
        Referral.countDocuments({ referrer: userId, status: "Completed" }),
        Order.countDocuments({ userId, deliveryStatus: "Completed" }),
        Referral.find({ referrer: userId }).sort({ createdAt: -1 }).skip(referralSkip).limit(referralLimit).lean(),
        ReferralHistory.find({ userId }).sort({ createdAt: -1 }).skip(coinSkip).limit(coinLimit).lean(),
    ]);

    const populatedReferrals = await User.populate(referrals, {
        path: "userId",
        select: "name",
        model: User,
    });
    const cleanReferrals = JSON.parse(JSON.stringify(populatedReferrals));

    let referredBy = null;
    if (userReferralRecord && userReferralRecord.referrer) {
        referredBy = await User.findById(userReferralRecord.referrer).select("name").lean();
    }

    const referralTotalPages = Math.ceil(totalReferralDocuments / referralLimit);
    const coinTotalPages = Math.ceil(totalCoinDocuments / coinLimit);

    return {
        user,
        referredBy,
        referrals: cleanReferrals,
        referralSettings: settings,
        successfulReferralCount,
        coinHistory,
        completedOrders,
        referralPagination: {
            page: referralPage,
            limit: referralLimit,
            totalPages: referralTotalPages,
            nextPage: referralPage + 1,
            prevPage: referralPage - 1,
            hasNextPage: referralPage < referralTotalPages,
            hasPrevPage: referralPage > 1,
            serialNumberStart: referralSkip,
        },
        coinPagination: {
            page: coinPage,
            limit: coinLimit,
            totalPages: coinTotalPages,
            nextPage: coinPage + 1,
            prevPage: coinPage - 1,
            hasNextPage: coinPage < coinTotalPages,
            hasPrevPage: coinPage > 1,
            serialNumberStart: coinSkip,
        }
    };
}

async function applyReferralCode(userId, referralCode) {
    const { refereeReward, coinValue } = await getReferralSettings();

    if (!referralCode) throw new Error("No Referral Code Detected");

    const referral = await Referral.findOne({ userId });
    if (!referral) throw new Error("Referral not found");
    if (referral.referrer) throw new Error("You have already applied a referral code.");

    const referrer = await Referral.findOne({ referralCode }).select("userId").lean();
    if (!referrer) throw new Error("Referral Code Invalid");
    if (referrer.userId.toString() === userId.toString()) throw new Error("You cannot refer yourself.");

    referral.referrer = referrer.userId;
    referral.referralCoins += refereeReward;
    await referral.save();

    await ReferralHistory.create({
        userId,
        coins: refereeReward,
        description: `Referral Bonus +${refereeReward} Coins`,
    });

    return {
        referralBonus: refereeReward,
        rewardCoins: referral.referralCoins,
        rewardValue: referral.referralCoins * Number(coinValue),
    };
}

async function redeemUserCoins(userId, redeemCoinInput) {
    const redeemCoin = Number(redeemCoinInput);
    if (!redeemCoin) throw new Error("Redeem coin amount is required.");
    if (redeemCoin < 1000 || redeemCoin % 1000 !== 0) {
        throw new Error("Redeem coin must be at least 1,000 and a multiple of 1,000.");
    }

    const [settings, referralRecord, completedOrders] = await Promise.all([
        getReferralSettings(),
        Referral.findOne({ userId }),
        Order.countDocuments({ userId, deliveryStatus: "Completed" })
    ]);

    const coinValue = settings?.coinValue || "0.010";

    if (!referralRecord || referralRecord.referralCoins < redeemCoin) {
        throw new Error(`Insufficient coins. You only have ${referralRecord?.referralCoins || 0} coins available.`);
    }

    if (completedOrders < 1) {
        throw new Error("Complete Your First Order");
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) throw new Error("Wallet not found.");

    const redeemAmount = redeemCoin * parseFloat(coinValue);
    const displayValue100 = 100 * parseFloat(coinValue);

    referralRecord.referralCoins -= redeemCoin;
    await referralRecord.save();

    wallet.balance += redeemAmount;
    wallet.transactions.push({
        type: "credit",
        amount: redeemAmount,
        description: `Redeemed ${redeemAmount} from ${redeemCoin} referral coins. Current value of 100 coins is ${displayValue100}`
    });
    await wallet.save();

    const referralHistory = await ReferralHistory.create({
        userId,
        coins: -redeemCoin,
        description: `${redeemCoin} coins redeemed to wallet.`
    });

    return {
        newWalletBalance: wallet.balance,
        newBalance: referralRecord.referralCoins,
        redeemAmount,
        history: {
            coins: referralHistory.coins,
            description: referralHistory.description,
            createdAt: referralHistory.createdAt
        }
    };
}

async function generateUniqueCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let referralCode = "";
    for (let i = 0; i < 6; i++) {
        referralCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const codeExists = await Referral.findOne({ referralCode }).lean();
    if (codeExists) return await generateUniqueCode();
    return referralCode;
}

async function createNewReferralRecord(userId, session = null) {
    const existingReferralQuery = Referral.findOne({ userId }).lean();
    if (session) existingReferralQuery.session(session);
    
    const existingReferral = await existingReferralQuery;
    if (existingReferral) return existingReferral;

    const { signupBonus } = await getReferralSettings();
    const referralCode = await generateUniqueCode();
    
    const newReferral = new Referral({
        userId,
        referralCode,
        referralCoins: signupBonus,
        referrer: null,
        status: "Pending",
    });

    const historyPayload = {
        userId,
        coins: signupBonus,
        description: `Signup Bonus +${signupBonus} Coins`,
    };

    if (session) {
        await ReferralHistory.create([historyPayload], { session });
        return await newReferral.save({ session });
    } else {
        await ReferralHistory.create(historyPayload);
        return await newReferral.save();
    }
}

async function processCronPendingReferrals() {
    const { referrerReward, referralHoldingPeriodDays } = await getReferralSettings();
    const referralHoldingPeriodMs = (referralHoldingPeriodDays || 7) * 24 * 60 * 60 * 1000;

    const pendingReferrals = await Referral.find({ status: "Pending" });
    if (pendingReferrals.length === 0) {
        return { success: true, message: "No pending referrals to process." };
    }

    for (const referral of pendingReferrals) {
        const { userId, referrer } = referral;
        const completedOrders = await Order.find({ userId, deliveryStatus: "Completed" });

        if (completedOrders.length === 0) continue;

        let selectedOrder = completedOrders[0];
        let maxDuration = new Date(selectedOrder.updatedAt) - new Date(selectedOrder.createdAt);

        for (let i = 1; i < completedOrders.length; i++) {
            const currentOrder = completedOrders[i];
            const currentDuration = new Date(currentOrder.updatedAt) - new Date(currentOrder.createdAt);
            if (currentDuration > maxDuration) {
                maxDuration = currentDuration;
                selectedOrder = currentOrder;
            }
        }

        const orderCreatedAtTime = new Date(selectedOrder.createdAt).getTime();
        const orderUpdatedAtTime = new Date(selectedOrder.updatedAt).getTime();
        const waitingThresholdTime = orderCreatedAtTime + referralHoldingPeriodMs;

        if (orderUpdatedAtTime > waitingThresholdTime) {
            referral.status = "Completed";
            referral.firstOrderCompletedAt = new Date();
            await referral.save();

            if (referrer) {
                await Referral.findOneAndUpdate(
                    { userId: referrer },
                    { $inc: { referralCoins: referrerReward } }
                );

                await ReferralHistory.create({
                    userId: referrer,
                    coins: referrerReward,
                    description: `Referral Reward of ${referrerReward} coins received for Referring a user.`,
                });
            }
        }
    }

    return { success: true, message: "Referrals processed successfully." };
}

module.exports = {
    getReferralSettings,
    getReferralDashboardData,
    applyReferralCode,
    redeemUserCoins,
    createNewReferralRecord,
    processCronPendingReferrals
};