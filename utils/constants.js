const COMMON_MESSAGES = {

    INTERNAL_SERVER_ERROR:
        "Internal server error",

    SERVER_ERROR:
        "Server error",

    SOMETHING_WENT_WRONG:
        "Something went wrong",

    INVALID_REQUEST:
        "Invalid request",

    ERROR_PROCESSING_REQUEST:
        "Error processing request",

    MISSING_REQUIRED_FIELDS:
        "Missing required fields",

    ALL_FIELDS_REQUIRED:
        "All required fields must be filled",

    CONNECTION_ERROR:
        "Connection error",

}






const AUTH_MESSAGES = {

    USER_NOT_FOUND:
        "User not found",

    INVALID_CREDENTIALS:
        "Invalid email or password",

    INVALID_PASSWORD:
        "Invalid password",

    USER_NOT_VERIFIED:
        "User is not verified",

    USER_BLOCKED:
        "User is blocked by admin",

    LOGIN_SUCCESS:
        "Login successful",

    EMAIL_VERIFIED:
        "Email verified successfully",

    VERIFICATION_EXPIRED:
        "Verification code expired",

    INVALID_VERIFICATION_CODE:
        "Invalid verification code",

    MAX_VERIFICATION_LIMIT:
        "Reached maximum limit",

    MAX_ATTEMPTS_REACHED:
        "Maximum attempts reached",

    TOO_MANY_ATTEMPTS:
        "Too many attempts. Try again later.",

    RESET_LINK_SENT:
        "If an account exists, a reset link has been sent",

    PASSWORD_RESET_SUCCESS:
        "Password reset successful",

    TOKEN_REQUIRED:
        "Token is required",

    INVALID_OR_EXPIRED_TOKEN:
        "Invalid or expired token",

    GOOGLE_LOGIN_DETECTED:
        "Google login detected",

    TRY_FORGOT_PASSWORD:
        "Try forgot password",

    ACCOUNT_DEACTIVATED:
        "Account deactivated successfully",

    VERIFICATION_ERROR:
        "An error occurred during verification",

}






const CART_MESSAGES = {

    ITEM_NOT_FOUND:
        "Item not found",

    ITEM_NOT_FOUND_IN_ORDER:
        "Item not found in order",

    ITEM_REMOVED:
        "Item removed successfully",

    CART_EMPTY:
        "Cart is empty",

    CART_NOT_FOUND:
        "Cart not found",

    FETCH_FAILED:
        "Failed to fetch cart data",

    RENDER_ERROR:
        "Cart render error",

    MIN_QUANTITY:
        "Min quantity is 1",

    MAX_QUANTITY:
        "Max 10 units",

    QUANTITY_DECREASED:
        "Quantity decreased",

    QUANTITY_UPDATED:
        "Quantity updated",

    ITEM_ADDED:
        "Added to cart",

    ONLY_AVAILABLE: (stock) =>
        `Only ${stock} available`,

}






const ADDRESS_MESSAGES = {

    NOT_FOUND:
        "Address not found",

    ADDED:
        "Address added successfully",

    UPDATED:
        "Address updated successfully",

    DELETED:
        "Address deleted successfully",

    DEFAULT_UPDATED:
        "Default address updated",

    DELETE_FAILED:
        "Failed to delete address",

    EDIT_FORM_FAILED:
        "Failed to load edit form",

    PHONE_INVALID:
        "Phone number must be 10 digits",

    ZIP_INVALID:
        "Zip code must be 6 digits",

}






const ORDER_MESSAGES = {

    ORDER_PLACED:
        "Order placed successfully",

    ORDER_FAILED:
        "Failed to place order.",

    ORDER_NOT_FOUND:
        "Order not found",

    ORDER_LIMIT_EXCEEDED: (limit) =>
        `Orders above ₹${limit} are not allowed. Please reduce your cart total.`,

    ITEM_ALREADY_CANCELLED:
        "Item is already cancelled",

    ONLY_PENDING_CANCEL:
        "Only pending items can be cancelled",

    ITEM_ALREADY_RETURNED:
        "Item is already returned",

    ONLY_DELIVERED_RETURN:
        "Only delivered items can be returned",

    CANCELLED_REFUND_SUCCESS:
        "Item cancelled and refund processed successfully",

    RETURN_REQUEST_SUCCESS:
        "Return request initiated successfully. Awaiting approval.",

    RETURN_REQUEST_FAILED:
        "An error occurred while initiating the return. Please try again.",

    STATUS_UPDATE_FAILED:
        "Failed to update status",

    STATUS_UPDATED: (status) =>
        `Status updated to ${status}`,

}






const PAYMENT_MESSAGES = {

    PAYMENT_VERIFIED:
        "Payment verified",

    PAYMENT_INIT_FAILED:
        "Payment failed to initialize",

    PAYMENT_CANCELLED:
        "Payment was cancelled",

    PAYMENT_VERIFICATION_FAILED:
        "Payment verification failed: Invalid signature",

    PAYMENT_VERIFICATION_ERROR:
        "Internal server error during verification",

    PAYMENT_CREATE_FAILED:
        "Failed to create order",

    RAZORPAY_INIT_FAILED:
        "Failed to initiate Razorpay",

    WRONG_PAYMENT_INFO:
        "Wrong payment info",

    SELECT_PAYMENT_METHOD:
        "Select any payment method",

}






const WALLET_MESSAGES = {

    WALLET_NOT_FOUND:
        "Wallet not found",

    NO_WALLET_FOUND:
        "No wallet found",

    INSUFFICIENT_BALANCE:
        "Insufficient balance detected",

    PAYMENT_FAILED:
        "Wallet payment failed.",

}






const COUPON_MESSAGES = {

    INVALID:
        "Coupon is not valid",

    APPLY_ERROR:
        "Error applying coupon",

    REMOVE_ERROR:
        "Error removing coupon",

    SAME_NAME_DETECTED:
        "Coupon with same name detected",

    CREATED:
        "Coupon created successfully",

    UPDATED:
        "Coupon updated successfully",

    DELETED:
        "Coupon deleted successfully",

    CREATE_FAILED:
        "Failed to create coupon",

    EDIT_FAILED:
        "Failed to edit coupon",

    NOT_FOUND:
        "Coupon not found",

    MIN_PURCHASE_REQUIRED: (amount) =>
        `Minimum purchase of ₹${amount} required`,

}






const OFFER_MESSAGES = {

    NOT_FOUND:
        "Offer not found",

    CREATED:
        "Offer created successfully",

    UPDATED:
        "Offer updated successfully",

    DELETED:
        "Offer deleted successfully",

    CODE_EXISTS:
        "Offer code already exists",

    INVALID_TYPE:
        "Invalid offer type",

    INVALID_DISCOUNT_TYPE:
        "Invalid discount type",

    INVALID_DISCOUNT_VALUE:
        "Invalid discount value",

    INVALID_DATES:
        "Invalid dates",

    INVALID_PERCENTAGE:
        "Percentage must be between 1 and 100",

    END_DATE_INVALID:
        "End date must be after start date",

    SELECT_ITEM_REQUIRED:
        "Please select at least one item",

    SELECT_TARGET_REQUIRED:
        "Please select at least one target",

    OFFER_NOT_ACTIVE:
        "This offer is not active.",

    INVALID_SUBCATEGORY_OFFER:
        "This offer is not a subcategory offer.",

    INVALID_PRODUCT_OFFER:
        "This offer is not applicable for this product.",

    SUBCATEGORY_MISMATCH:
        "This offer does not belong to this subcategory.",

    VARIANT_APPLY_FAILED:
        "Offer could not be applied to any product variant.",

    MANUAL_APPLIED:
        "Manual category offer applied successfully.",

    MANUAL_OVERRIDE_APPLIED:
        "Offer applied successfully with manual override.",

    AUTO_PRICING_ENABLED:
        "Automatic pricing enabled successfully.",

}






const CATEGORY_MESSAGES = {

    PARENT_NOT_FOUND:
        "Parent category not found",

    CATEGORY_NOT_FOUND:
        "Category not found.",

    CATEGORY_EXISTS:
        "Category already exists!",

    CATEGORY_ALREADY_EXISTS:
        "This category exists.",

    UPDATED:
        "Category updated successfully",

    DELETED:
        "Category and subcategories deleted successfully.",

    SUBCATEGORY_DELETED:
        "Subcategory deleted successfully.",

}






const PRODUCT_MESSAGES = {

    PRODUCT_NOT_FOUND:
        "Product not found.",

    PRODUCT_EXISTS:
        "Product already exists.",

    NAME_REQUIRED:
        "Product name is required.",

    INVALID_NAME:
        "Invalid product name.",

    NAME_LENGTH:
        "Product name must be between 3 and 100 characters.",

    DUPLICATE_NAME:
        "Another product with this name already exists.",

    CATEGORY_REQUIRED:
        "Category is required.",

    INVALID_CATEGORY:
        "Invalid category selected.",

    INVALID_GENDER:
        "Invalid gender selected.",

    DESCRIPTION_REQUIRED:
        "Description is required.",

    DESCRIPTION_MIN:
        "Description should contain at least 20 characters.",

    DESCRIPTION_MAX:
        "Description is too long.",

    SIZE_REQUIRED:
        "Size details are required.",

    DUPLICATE_SIZES:
        "Duplicate sizes are not allowed.",

    INVALID_SIZE:
        "Invalid size.",

    INVALID_QUANTITY:
        "Quantity must be at least 1.",

    INVALID_PRICE:
        "Price must be at least ₹200.",

    IMAGE_REQUIRED:
        "At least one image is required.",

    MAX_IMAGES:
        "Maximum 5 images allowed.",

    INVALID_IMAGE_FORMAT:
        "Invalid image format.",

    IMAGE_SIZE_LIMIT:
        "Each image must be below 10MB.",

    PRODUCT_ADD_FAILED:
        "Something went wrong while adding the product.",

    PRODUCT_UPDATE_FAILED:
        "Something went wrong while updating the product.",

    PRODUCT_DELETE_FAILED:
        "Error deleting product.",

    VARIATION_NOT_FOUND:
        "Product variation not found",

    OUT_OF_STOCK: (productName) =>
        `${productName} is out of stock`,

    VARIATION_MISSING: (productName) =>
        `${productName} variation not found`,

}






const WISHLIST_MESSAGES = {

    NOT_FOUND:
        "Wishlist not found",

    FETCH_FAILED:
        "Failed to fetch wishlist data",

    ITEM_ADDED:
        "Item added to wishlist!",

    ITEM_REMOVED:
        "Item removed from wishlist successfully",

}






const REPORT_MESSAGES = {

    PDF_GENERATION_FAILED:
        "Failed to generate PDF",

    EXCEL_GENERATION_FAILED:
        "Failed to generate excel report",

    INVOICE_GENERATION_FAILED:
        "Failed to generate invoice",

    COLLECTION_LOAD_FAILED:
        "Unable to load collections",

}






module.exports = {

    COMMON: COMMON_MESSAGES,

    AUTH: AUTH_MESSAGES,

    CART: CART_MESSAGES,

    ADDRESS: ADDRESS_MESSAGES,

    ORDER: ORDER_MESSAGES,

    PAYMENT: PAYMENT_MESSAGES,

    WALLET: WALLET_MESSAGES,

    COUPON: COUPON_MESSAGES,

    OFFER: OFFER_MESSAGES,

    CATEGORY: CATEGORY_MESSAGES,

    PRODUCT: PRODUCT_MESSAGES,

    WISHLIST: WISHLIST_MESSAGES,

    REPORT: REPORT_MESSAGES,

}