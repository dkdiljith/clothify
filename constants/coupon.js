

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



module.exports =  COUPON_MESSAGES