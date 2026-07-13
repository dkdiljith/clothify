const Settings = require("../models/settingSchema");
////////////////////////////////////////////////////////////////////////////////////////////////////

exports.initializeSettings = async (req, res) => {
  try {
    const settingsExist = await Settings.findOne({
      settingsType: "global_settings",
    });

    if (!settingsExist) {
      await Settings.create({});
      console.log("✅ Global settings initialized successfully.");
    }
  } catch (error) {
    console.error("❌ Error initializing settings:", error);
  }
};

///////////////////////////////////////////////////////////////////////////////////////////////////////

exports.landingPage = async (req, res) => {
  try {
    res.render(`admin/settings/landingPage`, { isSettings: true });
  } catch (error) {
    console.error(" Error initializing referral settings:", error);
  }
};




exports.referralSettingsRender = async (req, res) => {
  try {
    const settings = await Settings.findOne({
      settingsType: "global_settings",
    }).lean();

    if (!settings) {
      return res.status(404).render("error/404", {
        message: "Referral settings not found.",
      });
    }

    return res.render("admin/settings/referralSettings", {
      isSettings: true,
      settings,
    });
  } catch (error) {
    console.error("Error loading referral settings:", error);
    return res.status(500).render("error/500", {
      message: "Unable to load referral settings.",
    });
  }
};




exports.referralSettings = async (req, res) => {
  try {
    const {
      coinValue,
      signupBonus,
      referrerReward,
      refereeReward,
      referralHoldingPeriodDays,
    } = req.body;

    // Coin Value Validation
    if (
      !coinValue ||
      !/^(0(\.\d{1,5})?|1)$/.test(coinValue) ||
      Number(coinValue) <= 0 ||
      Number(coinValue) > 1
    ) {
      let message = "";

      if (!coinValue) {
        message = "Coin value is required.";
      } else if (!/^(0(\.\d{1,5})?|1)$/.test(coinValue)) {
        message =
          "Coin value must be 1 or values like 0.1, 0.01, 0.001, 0.0001 or 0.00001.";
      } else if (Number(coinValue) <= 0) {
        message = "Coin value must be greater than 0.";
      } else {
        message = "Coin value cannot exceed 1.";
      }

      return res.status(400).json({
        success: false,
        field: "coinValue",
        message,
      });
    }

    // Signup Bonus Validation
    if (
      !signupBonus ||
      !/^\d+$/.test(signupBonus) ||
      Number(signupBonus) < 1 ||
      Number(signupBonus) > 10000
    ) {
      let message = "";

      if (!signupBonus) {
        message = "Signup bonus is required.";
      } else if (!/^\d+$/.test(signupBonus)) {
        message = "Signup bonus must contain numbers only.";
      } else if (Number(signupBonus) < 1) {
        message = "Signup bonus must be at least 1 coin.";
      } else {
        message =
          "Clothify allows a maximum signup bonus of 10,000 coins.";
      }

      return res.status(400).json({
        success: false,
        field: "signupBonus",
        message,
      });
    }

    // Referrer Reward Validation
    if (
      !referrerReward ||
      !/^\d+$/.test(referrerReward) ||
      Number(referrerReward) < 1 ||
      Number(referrerReward) > 10000
    ) {
      let message = "";

      if (!referrerReward) {
        message = "Referrer reward is required.";
      } else if (!/^\d+$/.test(referrerReward)) {
        message = "Referrer reward must contain numbers only.";
      } else if (Number(referrerReward) < 1) {
        message = "Referrer reward must be at least 1 coin.";
      } else {
        message =
          "Clothify allows a maximum referrer reward of 10,000 coins.";
      }

      return res.status(400).json({
        success: false,
        field: "referrerReward",
        message,
      });
    }

    // Referee Reward Validation
    if (
      !refereeReward ||
      !/^\d+$/.test(refereeReward) ||
      Number(refereeReward) < 1 ||
      Number(refereeReward) > 10000
    ) {
      let message = "";

      if (!refereeReward) {
        message = "Referee reward is required.";
      } else if (!/^\d+$/.test(refereeReward)) {
        message = "Referee reward must contain numbers only.";
      } else if (Number(refereeReward) < 1) {
        message = "Referee reward must be at least 1 coin.";
      } else {
        message =
          "Clothify allows a maximum referee reward of 10,000 coins.";
      }

      return res.status(400).json({
        success: false,
        field: "refereeReward",
        message,
      });
    }

    // Holding Period Validation
    if (
      !referralHoldingPeriodDays ||
      !/^\d+$/.test(referralHoldingPeriodDays) ||
      Number(referralHoldingPeriodDays) < 1 ||
      Number(referralHoldingPeriodDays) > 30
    ) {
      let message = "";

      if (!referralHoldingPeriodDays) {
        message = "Holding period is required.";
      } else if (!/^\d+$/.test(referralHoldingPeriodDays)) {
        message = "Holding period must contain numbers only.";
      } else if (Number(referralHoldingPeriodDays) < 1) {
        message = "Holding period must be at least 1 day.";
      } else {
        message =
          "Clothify allows a maximum holding period of 30 days.";
      }

      return res.status(400).json({
        success: false,
        field: "referralHoldingPeriodDays",
        message,
      });
    }

    // Load Settings
    const settings = await Settings.findOne({
      settingsType: "global_settings",
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Global settings document not found.",
      });
    }

    // Update Values
    settings.referralSettings.coinValue = coinValue;
    settings.referralSettings.signupBonus = Number(signupBonus);
    settings.referralSettings.referrerReward = Number(referrerReward);
    settings.referralSettings.refereeReward = Number(refereeReward);
    settings.referralSettings.referralHoldingPeriodDays = Number(
      referralHoldingPeriodDays
    );

    // Save
    await settings.save();

    // Success
    return res.status(200).json({
      success: true,
      message: "Referral settings updated successfully.",
      referralSettings: settings.referralSettings,
    });

  } catch (error) {
    console.error("Referral Settings Update Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};