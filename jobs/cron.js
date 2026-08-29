import cron from 'node-cron';
import logger from '../config/logger.js';

import { pricingExpiryUpdate } from '../utils/pricingExpiry.js';
import { processPendingReferralsCron } from '../controllers/referralController.js';


//////////////////////////////////////////////////////////////////////////////////////////////////


//update offer & coupon & products
cron.schedule("*/5 * * * *", async () => {
    try {

        await pricingExpiryUpdate()

        logger.info("Offers,Coupons and Products updated successfully");

    } catch (error) {
        logger.error("scheduler failed:", error.message);
    }
});


//Referral Status Validation Checker
cron.schedule("0 * * * *", async () => {
    try {
        const result = await processPendingReferralsCron();
        if (result.success) {
            logger.info(result.message);
        } else {
            logger.error("Referral scheduler completed with errors:", result.error);
        }
    } catch (error) {
        logger.error("Referral scheduler crashed:", error.message);
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
