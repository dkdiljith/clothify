const Product = require(`../models/productSchema`)
const Coupon = require(`../models/couponSchema`)
const Offer = require(`../models/offerSchema`)



//////////////////////////////////VALIDITY MANAGER////////////////////////////////
exports.validity_manager = async (req, res, next) => {
    try {
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0); // Normalize date

        const [coupons, offers, products] = await Promise.all([
            Coupon.find(),
            Offer.find(),
            Product.find()
        ]);

        // ====================
        // COUPON EXPIRATION CHECK
        // ====================
        const expiredCoupons = coupons.filter(coupon => {
            const endDate = new Date(coupon.endDate);
            endDate.setHours(0, 0, 0, 0);
            return endDate < currentDate && coupon.isActive;
        });

        if (expiredCoupons.length > 0) {
            const couponBulkOps = expiredCoupons.map(coupon => ({
                updateOne: {
                    filter: { _id: coupon._id },
                    update: { $set: { isActive: false } }
                }
            }));
            await Coupon.bulkWrite(couponBulkOps);
            console.log(`🔒 Deactivated ${expiredCoupons.length} expired coupons`);
        }

        // ====================
        // OFFER EXPIRATION CHECK
        // ====================
        const expiredOffers = offers.filter(offer => {
            const endDate = new Date(offer.endDate);
            endDate.setHours(0, 0, 0, 0);
            return endDate < currentDate && offer.isActive;
        });

        if (expiredOffers.length > 0) {
            const offerBulkOps = expiredOffers.map(offer => ({
                updateOne: {
                    filter: { _id: offer._id },
                    update: { $set: { isActive: false } }
                }
            }));
            await Offer.bulkWrite(offerBulkOps);
            console.log(`🔒 Deactivated ${expiredOffers.length} expired offers`);
        }

        // ====================
        // CLEAN INVALID OFFERS FROM PRODUCTS
        // ====================
        const allOfferIds = new Set(offers.map(o => o._id.toString()));
        const activeOfferIds = new Set(
            offers.filter(o => o.isActive).map(o => o._id.toString())
        );

        let updatedProductCount = 0;

        for (const product of products) {
            let isModified = false;

            product.details = product.details.map(detail => {
                const offerId = detail.offerId?.toString();

                if (
                    offerId &&
                    (!allOfferIds.has(offerId) || !activeOfferIds.has(offerId))
                ) {
                    // Offer is either missing or inactive
                    detail.offerId = null;
                    detail.offerPrice = 0;
                    isModified = true;
                }

                return detail;
            });

            if (isModified) {
                await product.save();
                updatedProductCount++;
            }
        }

        if (updatedProductCount > 0) {
            console.log(`🧹 Cleaned invalid/missing offers from ${updatedProductCount} products`);
        }


         // ====================
        // CHECK 
        // ====================



        return next(); // Proceed to next middleware/route handler
    } catch (error) {
        console.error('❌ Error in validity_manager middleware:', error);
        return next(error); // Pass error to global error handler
    }
};