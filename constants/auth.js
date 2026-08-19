
const AUTH_MESSAGES = {
    USER_NOT_FOUND: "User not found",
    INVALID_CREDENTIALS: "Invalid email or password",
    INVALID_PASSWORD: "Invalid password",
    USER_NOT_VERIFIED: "User is not verified",
    USER_BLOCKED: "User is blocked by admin",
    LOGIN_SUCCESS: "Login successful",
    EMAIL_VERIFIED: "Email verified successfully",
    VERIFICATION_EXPIRED: "Verification code expired",
    INVALID_VERIFICATION_CODE: "Invalid verification code",
    MAX_VERIFICATION_LIMIT: "Reached maximum limit",
    MAX_ATTEMPTS_REACHED: "Maximum attempts reached",
    TOO_MANY_ATTEMPTS: "Too many attempts. Try again later.",
    RESET_LINK_SENT: "If an account exists, a reset link has been sent",
    PASSWORD_RESET_SUCCESS: "Password reset successful",
    TOKEN_REQUIRED: "Token is required",
    INVALID_OR_EXPIRED_TOKEN: "Invalid or expired token",
    GOOGLE_LOGIN_DETECTED: "Google login detected",
    TRY_FORGOT_PASSWORD: "Try forgot password",
    ACCOUNT_DEACTIVATED: "Account deactivated successfully",
    VERIFICATION_ERROR: "An error occurred during verification",
    ACCOUNT_EXIST: "An Account Exist with this email",
    ADMIN_NOT_FOUND: "Admin Not Found",
    

    NO_ACTIVE_OTP: "No active OTP request found. Please request a new code.",
    SESSION_EXPIRED_REGISTER: "Session expired. Please register again.",
    VERIFICATION_SESSION_NOT_FOUND: "Verification session not found.",
    OTP_RESENT_WAIT: "Please wait a few seconds before requesting another OTP.",
    OTP_RESEND_LIMIT_EXCEEDED: "OTP resend limit exceeded. Please try again tomorrow.",
    NO_ACTIVE_VERIFICATION: "No active verification request found.",
    EMAIL_ALREADY_VERIFIED: "Email is already verified.",
    EMAIL_REQUIRED: "Email is required.",
    INVALID_EMAIL_FORMAT: "Invalid email format.",
    PASSWORDS_DONT_MATCH: "Passwords do not match.",
    ALL_FIELDS_REQUIRED: "All fields are required.",
    SAME_PASSWORD_ERROR: "Your new password must be different from your current password.",
    VALID_EMAIL_REQUIRED: "Please enter a valid email address.",
    NO_OTP_DETECTED: "No OTP detected."
};

module.exports = AUTH_MESSAGES;