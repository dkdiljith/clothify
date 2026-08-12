const User = require(`../models/userSchema`);
const Wallet = require(`../models/walletSchema`);
const Order = require(`../models/orderSchema`);
const Referral = require(`../models/referralSchema`);
const ReferralHistory = require(`../models/referralHistorySchema`);
const Setting = require(`../models/settingSchema`);

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// safe fallback values
const DEFAULT_REFERRAL_SETTINGS = {
  coinValue: `0.010`,
  referrerReward: 300,
  refereeReward: 500,
  signupBonus: 1000,
};

async function getReferralSettings() {
  const result = await Setting.findOne().select("referralSettings").lean();
  return result?.referralSettings ?? DEFAULT_REFERRAL_SETTINGS;
}

//usage it like this
//const { coinValue, referrerReward, refereeReward, signUpBonus } = await getReferralSettings();

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////




exports.referral = async (req, res) => {
  try {
    const settings = await Setting.findOne().lean();
    const referralSettings = settings?.referralSettings || {
      coinValue: "0.010",
    };

    const userId = res.locals.user?._id;

    if (!userId) {
      return res.status(401).render("error/401", {
        message: "Unauthorized access.",
      });
    }

    // Pagination
    const referralPage = parseInt(req.query.referralPage) || 1;
    const coinPage = parseInt(req.query.coinPage) || 1;

    const referralLimit = 5;
    const coinLimit = 5;

    const referralSkip = (referralPage - 1) * referralLimit;
    const coinSkip = (coinPage - 1) * coinLimit;

    // User

    const [rawUser, userReferralRecord] = await Promise.all([
      User.findById(userId).lean(),
      Referral.findOne({ userId }).lean(),
    ]);

    if (!rawUser) {
      return res.status(404).render("error/404", {
        message: "User profile not found.",
      });
    }

    const user = {
      ...rawUser,
      referralCode: userReferralRecord?.referralCode || null,
      referralCoins: userReferralRecord?.referralCoins || 0,
    };

    // Counts

    const [
      totalReferralDocuments,
      totalCoinDocuments,
      successfulReferralCount,
      completedOrders,
    ] = await Promise.all([
      Referral.countDocuments({
        referrer: userId,
      }),

      ReferralHistory.countDocuments({
        userId,
      }),

      Referral.countDocuments({
        referrer: userId,
        status: "Completed",
      }),

      Order.countDocuments({
        userId,
        deliveryStatus: "Completed",
      }),
    ]);

    // Paginated Data

    const [referrals, coinHistory] = await Promise.all([
      Referral.find({
        referrer: userId,
      })
        .sort({ createdAt: -1 })
        .skip(referralSkip)
        .limit(referralLimit)
        .lean(),

      ReferralHistory.find({
        userId,
      })
        .sort({ createdAt: -1 })
        .skip(coinSkip)
        .limit(coinLimit)
        .lean(),
    ]);

    // Populate Referral Users

    const populatedReferrals = await User.populate(referrals, {
      path: "userId",
      select: "name",
      model: User,
    });

    const cleanReferrals = JSON.parse(JSON.stringify(populatedReferrals));

    // Referred By
    let referredBy = null;

    if (userReferralRecord && userReferralRecord.referrer) {
      referredBy = await User.findById(userReferralRecord.referrer)
        .select("name")
        .lean();
    }

    // Pagination Objects

    const referralTotalPages = Math.ceil(
      totalReferralDocuments / referralLimit,
    );

    const coinTotalPages = Math.ceil(totalCoinDocuments / coinLimit);

    // Render

    return res.render("user/referral", {
      user,
      referredBy,
      referrals: cleanReferrals,
      referralSettings,
      successfulReferralCount,
      coinHistory,
      completedOrders,
      user_sidebar: true,
      referralPagination: {
        page: referralPage,
        limit: referralLimit,
        totalPages: referralTotalPages,
        nextPage: referralPage + 1,
        prevPage: referralPage - 1,
        hasNextPage: referralPage < referralTotalPages,
        hasPrevPage: referralPage > 1,
        serialNumberStart: (referralPage - 1) * referralLimit,
      },

      coinPagination: {
        page: coinPage,
        limit: coinLimit,
        totalPages: coinTotalPages,
        nextPage: coinPage + 1,
        prevPage: coinPage - 1,
        hasNextPage: coinPage < coinTotalPages,
        hasPrevPage: coinPage > 1,
        serialNumberStart: (coinPage - 1) * coinLimit,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      error: "Referral Controller Error",
    });
  }
};




exports.applyReferral = async (req, res) => {
  try {
    const { referralCode } = req.body;

    const { signupBonus, refereeReward, coinValue } =
      await getReferralSettings();

    if (!referralCode) {
      return res.status(400).json({
        success: false,
        message: "No Referral Code Detected",
      });
    }

    const userId = res.locals.user._id;

    const referral = await Referral.findOne({ userId });

    if (!referral) {
      return res.status(404).json({
        success: false,
        message: "Referral not found",
      });
    }

    if (referral.referrer) {
      return res.status(400).json({
        success: false,
        message: "You have already applied a referral code.",
      });
    }

    const referrer = await Referral.findOne({
      referralCode,
    })
      .select("userId")
      .lean();

    if (!referrer) {
      return res.status(400).json({
        success: false,
        message: "Referral Code Invalid",
      });
    }

    if (referrer.userId.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot refer yourself.",
      });
    }

    // Apply Referral
    referral.referrer = referrer.userId;
    referral.referralCoins += refereeReward;
    await referral.save();

    // Coin History
    await ReferralHistory.create({
      userId,
      coins: refereeReward,
      description: `Referral Bonus +${refereeReward} Coins`,
    });

    // Hide Welcome Modal
    req.session.user.showWelcomeModal = false;

    return res.status(200).json({
      success: true,
      message: "Referral code applied successfully!",
      signupBonus,
      referralBonus: refereeReward,
      rewardCoins: referral.referralCoins,
      rewardValue: referral.referralCoins * Number(coinValue),
      referralApplied: true,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Referral Controller Error",
    });
  }
};




exports.cancelReferral = async (req, res) => {
  try {
    const { signupBonus, coinValue } = await getReferralSettings();

    const userId = res.locals.user._id;
    const referral = await Referral.findOne({ userId }).lean()

    req.session.user.showWelcomeModal = false;

    return res.status(200).json({
      success: true,
      signupBonus,
      referralBonus: 0,
      rewardCoins: referral.referralCoins,
      rewardValue: referral.referralCoins * Number(coinValue),
      referralApplied: false,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unable to dismiss referral popup.",
    });
  }
};




exports.redeemCoin = async (req, res) => {
  try {
    const redeemCoin = Number(req.body.reedeemCoinInput);

    if (!redeemCoin) {
      return res.status(400).json({
        success: false,
        message: "Redeem coin amount is required.",
      });
    }

    if (redeemCoin < 1000 || redeemCoin % 1000 !== 0) {
      return res.status(400).json({
        success: false,
        message: "Redeem coin must be at least 1,000 and a multiple of 1,000.",
      });
    }

    const userId = res.locals.user._id;

    const [settings, referralRecord] = await Promise.all([
      getReferralSettings(),
      Referral.findOne({ userId }),
    ]);

    const coinValue = settings?.coinValue || "0.010";

    if (!referralRecord || referralRecord.referralCoins < redeemCoin) {
      return res.status(400).json({
        success: false,
        message: `Insufficient coins. You only have ${referralRecord?.referralCoins || 0} coins available.`,
      });
    }

    const completedOrders = await Order.countDocuments({
      userId,
      deliveryStatus: "Completed",
    });

    if (completedOrders >= 1) {
      // Fetch the user's wallet
      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        return res.status(400).json({
          success: false,
          message: "Wallet not found.",
        });
      }

      // FIX: Use parseFloat so money decimals aren't wiped out to zero
      const redeemAmount = redeemCoin * parseFloat(coinValue);
      const displayValue100 = 100 * parseFloat(coinValue);

      // Update the databases
      referralRecord.referralCoins -= redeemCoin;
      await referralRecord.save();

      // Credit wallet
      wallet.balance += redeemAmount;
      wallet.transactions.push({
        type: "credit",
        amount: redeemAmount,
        description: `Redeemed ${redeemAmount} from ${redeemCoin} referral coins. Current value of 100 coins is ${displayValue100}`
      });
      await wallet.save();

      // Referral History
      const referralHistory = await ReferralHistory.create({
        userId,
        coins: -redeemCoin,
        description: `${redeemCoin} coins redeemed to wallet.`
      });

      // Response
      return res.status(200).json({
        success: true,
        message: `Successfully redeemed ${redeemCoin} coins for ₹${redeemAmount.toFixed(2)}!`,

        newWalletBalance: wallet.balance,

        newBalance: referralRecord.referralCoins,

        history: {
          coins: referralHistory.coins,
          description: referralHistory.description,
          createdAt: referralHistory.createdAt
        }
      });
    }

    return res.status(400).json({
      success: false,
      message: "Complete Your First Order",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while redeeming coins.",
    });
  }
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////




//ReferralCode Creator
const generateUniqueCode = async () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let referralCode = "";
  for (let i = 0; i < 6; i++) {
    referralCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  //code  exist check
  const codeExists = await Referral.findOne({ referralCode }).lean();
  if (codeExists) {
    return await generateUniqueCode();
  }

  return referralCode;
};




// Referral Creator
exports.createReferral = async (userId, session = null) => {
  try {
    const existingReferralQuery = Referral.findOne({ userId }).lean();
    if (session) {
      existingReferralQuery.session(session);
    }
    const existingReferral = await existingReferralQuery;
    if (existingReferral) {
      return existingReferral;
    }
    const { signupBonus } = await getReferralSettings();
    const referralCode = await generateUniqueCode();
    const newReferral = new Referral({
      userId,
      referralCode,
      referralCoins: signupBonus,
      referrer: null,
      status: "Pending",
    });
    if (session) {
      await ReferralHistory.create([{
        userId,
        coins: signupBonus,
        description: `Signup Bonus +${signupBonus} Coins`,
      }], { session });
    } else {
      await ReferralHistory.create({
        userId,
        coins: signupBonus,
        description: `Signup Bonus +${signupBonus} Coins`,
      });
    }
    const savedReferral = session
      ? await newReferral.save({ session })
      : await newReferral.save();
    return savedReferral;
  } catch {
    return {}
  }
};


/////////////////////////////////////////////////////////cron//////////////////////////////////////////////////////////////////////////////////



exports.processPendingReferralsCron = async () => {
  try {

    const { referrerReward, referralHoldingPeriodDays } = await getReferralSettings();
    const referralHoldingPeriodMs = referralHoldingPeriodDays * 24 * 60 * 60 * 1000;

    // Fetch all referrals that are currently Pending
    const pendingReferrals = await Referral.find({ status: "Pending" });

    if (pendingReferrals.length === 0) {
      return { success: true, message: "No pending referrals to process." };
    }

    for (const referral of pendingReferrals) {
      const { userId, referrer } = referral;

      // Fetch all completed orders for this specific referred user
      const completedOrders = await Order.find({
        userId: userId,
        deliveryStatus: "Completed",
      });

      if (completedOrders.length === 0) {
        continue;
      }

      // Prioritise and select the order with the greatest (updatedAt - createdAt) duration
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

      // Check if the selected order's updatedAt is past the threshold:
      // (order.updatedAt > order.createdAt + statusWaitingPeriod)
      const orderCreatedAtTime = new Date(selectedOrder.createdAt).getTime();
      const orderUpdatedAtTime = new Date(selectedOrder.updatedAt).getTime();
      const waitingThresholdTime = orderCreatedAtTime + referralHoldingPeriodMs;

      if (orderUpdatedAtTime > waitingThresholdTime) {
        // Complete the Referral Status
        referral.status = "Completed";
        referral.firstOrderCompletedAt = new Date();
        await referral.save();

        // Increment coins for the referrer (if a referrer exists)
        if (referrer) {
          await Referral.findOneAndUpdate(
            { userId: referrer },
            { $inc: { referralCoins: referrerReward } }
          );

          // 8. Log the event into Referral History
          const referralHistory = new ReferralHistory({
            userId: referrer,
            coins: referrerReward,
            description: `Referral Reward of ${referrerReward} coins received for Referring a user.`,
          });
          await referralHistory.save();
        }
      }
    }

    return { success: true, message: "Referrals processed successfully." };
  } catch (error) {
    return { success: false, error: error.message };
  }
};