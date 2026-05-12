const COMMON_MESSAGES = {

    SOMETHING_WENT_WRONG:
        "Something went wrong",

    SOMETHING_WENT_WRONG_RETRY:
        "Something went wrong. Please try again.",

    ERROR_OCCURRED:
        "An error occurred",

    ERROR_OCCURRED_RETRY:
        "An error occurred. Please try again.",

    OPERATION_FAILED:
        "Operation failed",

    CONNECTION_ERROR:
        "Connection error",

    SAVE_SUCCESS:
        "Saved successfully.",

}






const AUTH_MESSAGES = {

    LOGIN_REQUIRED:
        "Login First :)",

    CURRENT_PASSWORD_REQUIRED:
        "Current password is required",

    NEW_PASSWORD_REQUIRED:
        "New password is required",

    PASSWORD_MIN_LENGTH:
        "Password must be at least 8 characters",

    PASSWORD_UPPERCASE:
        "Password must contain at least one uppercase letter",

    PASSWORD_NUMBER:
        "Password must contain at least one number",

    PASSWORD_SPECIAL_CHARACTER:
        "Password must contain at least one special character",

    PASSWORD_CONFIRM_REQUIRED:
        "Please confirm your password",

    PASSWORD_MISMATCH:
        "Passwords do not match",

    PASSWORD_UPDATED:
        "Password updated successfully!",

}






const CART_MESSAGES = {

    SIZE_REQUIRED:
        "Please select a size first",

    INVALID_PRODUCT:
        "Please select a valid product",

    REMOVE_FAILED:
        "Failed to remove item",

    REMOVE_FAILED_RETRY:
        "Failed to remove item. Please try again.",

}






const PROFILE_MESSAGES = {

    IMAGE_SIZE_LIMIT:
        "File size should be less than 2MB",

    INVALID_IMAGE_FORMAT:
        "Only JPG and PNG files are allowed",

    IMAGE_UPLOAD_FAILED:
        "Failed to upload image",

    IMAGE_UPDATED:
        "Profile picture updated successfully",

}






const COUPON_MESSAGES = {

    LOAD_FAILED:
        "Failed to load coupon data",

    APPLY_FAILED:
        "Failed to apply coupon",

    APPLY_FAILED_RETRY:
        "Failed to apply coupon. Please try again.",

    REMOVE_FAILED_RETRY:
        "Failed to remove coupon. Please try again.",

    DELETE_FAILED:
        "Failed to delete the coupon.",

    MIN_PURCHASE_REQUIRED: (amount) =>
        `This coupon requires a minimum purchase of ₹${amount}`,

}






const OFFER_MESSAGES = {

    LOAD_FAILED:
        "Failed to load offer data",

    SELECT_REQUIRED:
        "Please select an offer.",

    TYPE_REQUIRED:
        "Please select Offer Type first",

    APPLIED:
        "Offer applied.",

    APPLIED_SUCCESS:
        "Offer applied successfully.",

    AUTO_PRICING_ENABLED:
        "Automatic pricing enabled.",

    ITEMS_LINKED: (count) =>
        `${count} items linked to offer`,

}






const PAYMENT_MESSAGES = {

    PAYMENT_INIT_FAILED:
        "Payment failed to initialize",

    PAYMENT_CANCELLED:
        "Payment was cancelled",

    SELECT_PAYMENT_METHOD:
        "Select any payment method",

    VERIFICATION_FAILED: (message) =>
        `Verification failed: ${message}`,

}






window.MESSAGES = {

    COMMON: COMMON_MESSAGES,

    AUTH: AUTH_MESSAGES,

    CART: CART_MESSAGES,

    PROFILE: PROFILE_MESSAGES,

    COUPON: COUPON_MESSAGES,

    OFFER: OFFER_MESSAGES,

    PAYMENT: PAYMENT_MESSAGES,

}


//usage
// showPopupMessage(
//     MESSAGES.COMMON.SOMETHING_WENT_WRONG,
//     "error"
// )