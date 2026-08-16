
const CART_MESSAGES = {

    ITEM_NOT_FOUND:
        "Item not found",

    ITEM_REMOVED:
        "Item removed successfully",

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
    FAILED_ITEM_ADDED:
        "Failed Added to Cart",
    FAILED_TO_FETCH:
        "Failed to fetch Cart Data",
    FAILED_PAYMENTPAGE:
        "Failed to fetch Payment Page",

    ONLY_AVAILABLE: (stock) =>
        `Only ${stock} available`,

}



module.exports = CART_MESSAGES