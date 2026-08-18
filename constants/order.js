
const ORDER_MESSAGES = {

    ORDER_PLACED:
        "Order placed successfully",

    ORDER_FAILED:
        "Failed to place order.",
        FAILED_RENDER:
        "Failed to load orders.",

    ORDER_NOT_FOUND:
        "Order not found",

           ITEM_NOT_FOUND:
        "Item not found",

        FAILED_ORDER_CANCELLATION:
        "Failed Order Cancellation",
        FAILED_ORDER_RETURN:
        "Failed Order Returning",

    ORDER_LIMIT_EXCEEDED: (limit) =>
        `Orders above ₹${limit} are not allowed. Please reduce your cart total.`,

    ITEM_ALREADY_CANCELLED:
        "Item is already cancelled",

    ONLY_PENDING_CANCEL:
        "Only pending items can be cancelled",

    ITEM_ALREADY_RETURNED:
        "Item is already returned",
           ITEM_ALREADY_REQUEST_RETURNED:
        "item return already requested",

        CANNOT_PROCESS_BULKRETURN:
        `Cannot process bulk return` ,

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
    CANNOT_STATUS_UPDATE:(status)=>
    `Cannot change status. Item is already ${status}.`,

}




module.exports =  ORDER_MESSAGES

 