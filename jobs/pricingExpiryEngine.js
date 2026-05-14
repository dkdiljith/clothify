const cron = require("node-cron");

//update offer & coupon & products
const pricingExpiry = require("../services/pricingExpiry");
const pricingExpiryUpdate = pricingExpiry.pricingExpiryUpdate

//MESSAGE_CONSTANTS
const MESSAGES = require(`../utils/constants`)

//////////////////////////////////////////////////////////////////////////////////////////////////



cron.schedule("*/5 * * * *", async () => {
    try {

        await pricingExpiryUpdate()

        console.log("Offers,Coupons and Products updated successfully");

    } catch (error) {
        console.log("scheduler failed:", error.message);
    }
});
