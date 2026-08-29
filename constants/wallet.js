// constants/wallet.js
const WALLET_MESSAGES = {
    NOT_FOUND: "Wallet not found",
    USER_NOT_FOUND: "User not found",
    INTERNAL_SERVER_ERROR: "Internal Server Error",
    PAYMENT_VERIFIED: "Payment verified",
    FAILED_TO_CREATE_ORDER: "Failed to create order",
    INVALID_SIGNATURE: "Invalid signature",
    WALLET_PAYMENT_FAILED: "Failed to process wallet payment",
    WALLET_RECHARGE_DESC: (amount, paymentId) => 
        `Wallet recharge: ₹${amount} via Razorpay (ID: ${paymentId})`,
    REFUND_WALLET: (productName, orderId) => 
        `Refund for returned item (${productName}) in Order #${orderId}`,
};

export default WALLET_MESSAGES;