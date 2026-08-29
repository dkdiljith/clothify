// constants/order.js
const ORDER_MESSAGES = {
    ORDER_PLACED: "Order placed successfully",
    ORDER_FAILED: "Failed to place order.",
    FAILED_RENDER: "Failed to load orders.",
    ORDER_NOT_FOUND: "Order not found",
    ITEM_NOT_FOUND: "Item not found",
    FAILED_ORDER_CANCELLATION: "Failed Order Cancellation",
    FAILED_ORDER_RETURN: "Failed Order Returning",

    ORDER_LIMIT_EXCEEDED: (limit) =>
        `Orders above ₹${limit} are not allowed. Please reduce your cart total.`,

    ITEM_ALREADY_CANCELLED: "Item is already cancelled",
    ONLY_PENDING_CANCEL: "Only pending items can be cancelled",
    ITEM_ALREADY_RETURNED: "Item is already returned",
    ITEM_ALREADY_REQUEST_RETURNED: "item return already requested",
    CANNOT_PROCESS_BULKRETURN: "Cannot process bulk return",
    ONLY_DELIVERED_RETURN: "Only delivered items can be returned",
    CANCELLED_REFUND_SUCCESS: "Item cancelled and refund processed successfully",
    RETURN_REQUEST_SUCCESS: "Return request initiated successfully. Awaiting approval.",
    RETURN_REQUEST_FAILED: "An error occurred while initiating the return. Please try again.",
    STATUS_UPDATE_FAILED: "Failed to update status",

    STATUS_UPDATED: (status) => `Status updated to ${status}`,
    CANNOT_STATUS_UPDATE: (status) => `Cannot change status. Item is already ${status}.`,

    // Controller & Service Messages
    SERVER_ERROR: "Server error",
    PAYMENT_FAILED_ATTEMPT: (attempts) => `Payment failed again. Attempt ${attempts}/6 used.`,
    FAILED_ORDER_RECORD_GENERATED: "Failed order record generated. You can retry from your dashboard.",
    FAILED_TO_RETRY_PAYMENT: "Failed to retry payment.",
    ORDER_STATUS_UPDATED: "Order status updated and stock reduced successfully.",

    MISSING_REQUIRED_FIELDS: "Missing required fields",
    WRONG_PAYMENT_INFO: "Wrong Payment Info",
    CART_EMPTY: "Your cart is empty.",
    ADDRESS_NOT_FOUND: "Address not found",
    VARIATION_NOT_FOUND: (productName) => `${productName} variation not found`,
    OUT_OF_STOCK: (productName) => `${productName} is out of stock`,
    INSUFFICIENT_WALLET: "Insufficient wallet balance",
    WALLET_DEBIT_DESC: (amount) => `₹${amount} debited for order payment`,
    WALLET_PAYMENT_FAILED: "Wallet payment failed.",
    STOCK_OUT_DURING_ORDER: (productName) => `${productName} went out of stock while placing the order.`,
    INVALID_ORDER_ID: "Invalid Order ID provided",
    ORDER_ALREADY_COMPLETED: "Order is already completed",
    INSUFFICIENT_STOCK_GENERAL: "Insufficient stock for one or more products.",
    RETRY_WINDOW_EXPIRED: "The 30-minute retry window has expired. Please create a new order.",
    MAX_RETRY_EXCEEDED: "You have reached the maximum limit of 5 payment retries for this order."
};

export default ORDER_MESSAGES;