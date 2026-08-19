// services/settingsService.js
const Settings = require("../models/settingSchema");
const logger = require('../config/logger');


const SETTINGS_MESSAGES = require("../constants/settings");
const STATUS_CODES = require("../constants/status-codes");

async function initializeGlobalSettings() {
    try {
        const settingsExist = await Settings.findOne({
            settingsType: "global_settings",
        });

        if (!settingsExist) {
            await Settings.create({});
            logger.info(SETTINGS_MESSAGES.GLOBAL_SETTINGS_INITIALIZED);
        }
    } catch (error) {
        logger.error(SETTINGS_MESSAGES.ERROR_INITIALIZING, error);
    }
}

async function getReferralSettings() {
    const settings = await Settings.findOne({
        settingsType: "global_settings",
    }).lean();

    if (!settings) {
        throw new Error(SETTINGS_MESSAGES.REFERRAL_SETTINGS_NOT_FOUND);
    }
    return settings;
}

async function updateReferralSettings(body) {
    const {
        coinValue,
        signupBonus,
        referrerReward,
        refereeReward,
        referralHoldingPeriodDays,
    } = body;

    // Coin Value Validation
    if (
        !coinValue ||
        !/^(0(\.\d{1,5})?|1)$/.test(coinValue) ||
        Number(coinValue) <= 0 ||
        Number(coinValue) > 1
    ) {
        let message;
        if (!coinValue) {
            message = SETTINGS_MESSAGES.COIN_VALUE_REQUIRED;
        } else if (!/^(0(\.\d{1,5})?|1)$/.test(coinValue)) {
            message = SETTINGS_MESSAGES.COIN_VALUE_FORMAT;
        } else if (Number(coinValue) <= 0) {
            message = SETTINGS_MESSAGES.COIN_VALUE_MIN;
        } else {
            message = SETTINGS_MESSAGES.COIN_VALUE_MAX;
        }
        const err = new Error(message);
        err.field = "coinValue";
        throw err;
    }

    // Signup Bonus Validation
    if (
        !signupBonus ||
        !/^\d+$/.test(signupBonus) ||
        Number(signupBonus) < 1 ||
        Number(signupBonus) > 10000
    ) {
        let message;
        if (!signupBonus) {
            message = SETTINGS_MESSAGES.SIGNUP_BONUS_REQUIRED;
        } else if (!/^\d+$/.test(signupBonus)) {
            message = SETTINGS_MESSAGES.SIGNUP_BONUS_FORMAT;
        } else if (Number(signupBonus) < 1) {
            message = SETTINGS_MESSAGES.SIGNUP_BONUS_MIN;
        } else {
            message = SETTINGS_MESSAGES.SIGNUP_BONUS_MAX;
        }
        const err = new Error(message);
        err.field = "signupBonus";
        throw err;
    }

    // Referrer Reward Validation
    if (
        !referrerReward ||
        !/^\d+$/.test(referrerReward) ||
        Number(referrerReward) < 1 ||
        Number(referrerReward) > 10000
    ) {
        let message;
        if (!referrerReward) {
            message = SETTINGS_MESSAGES.REFERRER_REWARD_REQUIRED;
        } else if (!/^\d+$/.test(referrerReward)) {
            message = SETTINGS_MESSAGES.REFERRER_REWARD_FORMAT;
        } else if (Number(referrerReward) < 1) {
            message = SETTINGS_MESSAGES.REFERRER_REWARD_MIN;
        } else {
            message = SETTINGS_MESSAGES.REFERRER_REWARD_MAX;
        }
        const err = new Error(message);
        err.field = "referrerReward";
        throw err;
    }

    // Referee Reward Validation
    if (
        !refereeReward ||
        !/^\d+$/.test(refereeReward) ||
        Number(refereeReward) < 1 ||
        Number(refereeReward) > 10000
    ) {
        let message;
        if (!refereeReward) {
            message = SETTINGS_MESSAGES.REFEREE_REWARD_REQUIRED;
        } else if (!/^\d+$/.test(refereeReward)) {
            message = SETTINGS_MESSAGES.REFEREE_REWARD_FORMAT;
        } else if (Number(refereeReward) < 1) {
            message = SETTINGS_MESSAGES.REFEREE_REWARD_MIN;
        } else {
            message = SETTINGS_MESSAGES.REFEREE_REWARD_MAX;
        }
        const err = new Error(message);
        err.field = "refereeReward";
        throw err;
    }

    // Holding Period Validation
    if (
        !referralHoldingPeriodDays ||
        !/^\d+$/.test(referralHoldingPeriodDays) ||
        Number(referralHoldingPeriodDays) < 1 ||
        Number(referralHoldingPeriodDays) > 30
    ) {
        let message;
        if (!referralHoldingPeriodDays) {
            message = SETTINGS_MESSAGES.HOLDING_PERIOD_REQUIRED;
        } else if (!/^\d+$/.test(referralHoldingPeriodDays)) {
            message = SETTINGS_MESSAGES.HOLDING_PERIOD_FORMAT;
        } else if (Number(referralHoldingPeriodDays) < 1) {
            message = SETTINGS_MESSAGES.HOLDING_PERIOD_MIN;
        } else {
            message = SETTINGS_MESSAGES.HOLDING_PERIOD_MAX;
        }
        const err = new Error(message);
        err.field = "referralHoldingPeriodDays";
        throw err;
    }

    const settings = await Settings.findOne({
        settingsType: "global_settings",
    });

    if (!settings) {
        const err = new Error(SETTINGS_MESSAGES.GLOBAL_SETTINGS_NOT_FOUND);
        err.status = STATUS_CODES.NOT_FOUND;
        throw err;
    }

    settings.referralSettings.coinValue = coinValue;
    settings.referralSettings.signupBonus = Number(signupBonus);
    settings.referralSettings.referrerReward = Number(referrerReward);
    settings.referralSettings.refereeReward = Number(refereeReward);
    settings.referralSettings.referralHoldingPeriodDays = Number(referralHoldingPeriodDays);

    await settings.save();
    return settings.referralSettings;
}

module.exports = {
    initializeGlobalSettings,
    getReferralSettings,
    updateReferralSettings
};