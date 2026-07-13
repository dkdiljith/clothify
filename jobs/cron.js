const cron = require("node-cron");

const pricingExpiryUpdate = require("../services/pricingExpiry").pricingExpiryUpdate
const referralCronService = require(`../controllers/referralController`).processPendingReferralsCron

//MESSAGE_CONSTANTS
const MESSAGES = require(`../utils/constants`)

//////////////////////////////////////////////////////////////////////////////////////////////////


//update offer & coupon & products
cron.schedule("*/5 * * * *", async () => {
    try {

        await pricingExpiryUpdate()

        console.log("Offers,Coupons and Products updated successfully");

    } catch (error) {
        console.log("scheduler failed:", error.message);
    }
});


//Referral Status Validation Checker
cron.schedule("0 * * * *", async () => {
    try {
        console.log("Running Pending Referral validation checks...");
        const result = await referralCronService();
        if (result.success) {
            console.log(result.message);
        } else {
            console.log("Referral scheduler completed with errors:", result.error);
        }
    } catch (error) {
        console.log("Referral scheduler crashed:", error.message);
    }
});






//  CRON TIME SCHEDULE REFERENCE GUIDE
 
//  Expression Structure: "minute hour day-of-month month day-of-week"
//  Allowed Values:
//    ┌────────────── minute (0 - 59)
//    │ ┌──────────── hour (0 - 23)
//    │ │ ┌────────── day of month (1 - 31)
//    │ │ │ ┌──────── month (1 - 12)
//    │ │ │ │ ┌────── day of week (0 - 7) (0 or 7 is Sunday)
//    │ │ │ │ │
//    * * * * *

//   COMMON INTERVAL EXAMPLES FOR THIS APP:
//  * - "* * * * *"     = Every single minute (Highly discouraged for heavy DB tasks)
//  * - "*/5 * * * *"   = Every 5 minutes (e.g., 12:00, 12:05, 12:10)
//  * - "*/30 * * * *"  = Every 30 minutes (e.g., 12:00, 12:30, 1:00)
//  * - "0 * * * *"     = Every 1 hour at exactly the 0th minute (Production Standard)
//  * - "0 0 * * *"     = Daily at midnight (12:00 AM)
