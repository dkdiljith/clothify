// constants/settings.js
const SETTINGS_MESSAGES = {
    GLOBAL_SETTINGS_INITIALIZED: "✅ Global settings initialized successfully.",
    ERROR_INITIALIZING: "❌ Error initializing settings:",
    REFERRAL_SETTINGS_NOT_FOUND: "Referral settings not found.",
    GLOBAL_SETTINGS_NOT_FOUND: "Global settings document not found.",
    UNABLE_LOAD_REFERRAL: "Unable to load referral settings.",
    REFERRAL_UPDATED_SUCCESS: "Referral settings updated successfully.",
    INTERNAL_SERVER_ERROR: "Internal server error.",
    
    // Validation Messages
    COIN_VALUE_REQUIRED: "Coin value is required.",
    COIN_VALUE_FORMAT: "Coin value must be 1 or values like 0.1, 0.01, 0.001, 0.0001 or 0.00001.",
    COIN_VALUE_MIN: "Coin value must be greater than 0.",
    COIN_VALUE_MAX: "Coin value cannot exceed 1.",

    SIGNUP_BONUS_REQUIRED: "Signup bonus is required.",
    SIGNUP_BONUS_FORMAT: "Signup bonus must contain numbers only.",
    SIGNUP_BONUS_MIN: "Signup bonus must be at least 1 coin.",
    SIGNUP_BONUS_MAX: "Clothify allows a maximum signup bonus of 10,000 coins.",

    REFERRER_REWARD_REQUIRED: "Referrer reward is required.",
    REFERRER_REWARD_FORMAT: "Referrer reward must contain numbers only.",
    REFERRER_REWARD_MIN: "Referrer reward must be at least 1 coin.",
    REFERRER_REWARD_MAX: "Clothify allows a maximum referrer reward of 10,000 coins.",

    REFEREE_REWARD_REQUIRED: "Referee reward is required.",
    REFEREE_REWARD_FORMAT: "Referee reward must contain numbers only.",
    REFEREE_REWARD_MIN: "Referee reward must be at least 1 coin.",
    REFEREE_REWARD_MAX: "Clothify allows a maximum referee reward of 10,000 coins.",

    HOLDING_PERIOD_REQUIRED: "Holding period is required.",
    HOLDING_PERIOD_FORMAT: "Holding period must contain numbers only.",
    HOLDING_PERIOD_MIN: "Holding period must be at least 1 day.",
    HOLDING_PERIOD_MAX: "Clothify allows a maximum holding period of 30 days.",
};

export default SETTINGS_MESSAGES;