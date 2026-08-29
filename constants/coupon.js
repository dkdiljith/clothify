

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
        FAILED_DELETE:
        "Coupon delete Failed",

    CREATE_FAILED:
        "Failed to create coupon",

    EDIT_FAILED:
        "Failed to edit coupon",

    NOT_FOUND:
        "Coupon not found",
        FETCHING_FAILED:
        "Error fetching Coupon, Try again",

        VALIDATION:
        "Missing required Fields",

        MAXIMUM_VALIDATION:
        "Maximum purchase amount must be greater than or equal to minimum purchase amount.",
        DISCOUNT_VALIDATION:
        "Discount value must be greater than 0.",
        STARTDATE_VALIDATION:
        "Invalid date format provided.",
        ENDDATE_VALIDATION:
        "End date must be after the start date.",
        

    MIN_PURCHASE_REQUIRED: (amount) =>
        `Minimum purchase of ₹${amount} required`,
     MAX_PURCHASE_REQUIRED: (amount) =>
        `Maximum purchase of ₹${amount} required`,
    COUPON_EXIST:(code)=>
        `Coupon Code ${code} already Exist`

}



export default  COUPON_MESSAGES