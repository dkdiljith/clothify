import Offer from '../models/offerSchema.js';
import Coupon from '../models/couponSchema.js';
import Product from '../models/productSchema.js';
import Category from '../models/categorySchema.js';


////////////////////////////////////////////////////////////////////////////////////////////////////

exports.pricingExpiryUpdate = async () => {

        const now = new Date();

        // activate valid offers
        await Offer.updateMany(
            { startDate: { $lte: now }, endDate: { $gte: now }, isActive: false },
            { $set: { isActive: true } }
        );

        // collect expired / future active offers
        const inactiveOffers = await Offer.find({
            $or: [
                { startDate: { $gt: now } },
                { endDate: { $lt: now } }
            ],
            isActive: true
        }).lean();

        const inactiveOfferIds = inactiveOffers.map(item => item._id);

        // deactivate invalid offers
        await Offer.updateMany(
            {
                $or: [
                    { startDate: { $gt: now } },
                    { endDate: { $lt: now } }
                ],
                isActive: true
            },
            { $set: { isActive: false } }
        );

        // clear all expired offer inside products
        if (inactiveOfferIds.length > 0) {
            await Product.updateMany(
                { "details.offerId": { $in: inactiveOfferIds } },
                {
                    $set: {
                        "details.$[item].offerLocked": false,
                        "details.$[item].offerId": null,
                        "details.$[item].offerPrice": 0
                    }
                },
                {
                    arrayFilters: [
                        {
                            "item.offerId": { $in: inactiveOfferIds }
                        }
                    ]
                }
            );

            await Category.updateMany(
                { offerId: { $in: inactiveOfferIds } },
                {
                    $set: {
                        offerId: null,
                        offerLocked: false
                    }
                }
            );
        }

        // coupon status update
        await Coupon.updateMany(
            { startDate: { $lte: now }, endDate: { $gte: now }, isActive: false },
            { $set: { isActive: true } }
        );

        await Coupon.updateMany(
            {
                $or: [
                    { startDate: { $gt: now } },
                    { endDate: { $lt: now } }
                ],
                isActive: true
            },
            { $set: { isActive: false } }
        );

        // active offers
        const activeOffers = await Offer.find({ isActive: true }).lean();

        const productOfferMap = new Map();
        const categoryOfferMap = new Map();

        for (let i = 0; i < activeOffers.length; i++) {
            const offer = activeOffers[i];

            if (offer.offerType === "product") {
                for (let j = 0; j < offer.targetIds.length; j++) {
                    const id = offer.targetIds[j].toString();

                    if (!productOfferMap.has(id)) {
                        productOfferMap.set(id, []);
                    }

                    productOfferMap.get(id).push(offer);
                }
            }

            if (offer.offerType === "subcategory") {
                for (let j = 0; j < offer.targetIds.length; j++) {
                    const id = offer.targetIds[j].toString();

                    if (!categoryOfferMap.has(id)) {
                        categoryOfferMap.set(id, []);
                    }

                    categoryOfferMap.get(id).push(offer);
                }
            }
        }


        // choose best active offer for every subcategory and store in category.offerId
        const subcategories = await Category.find(
            { parentCategory: { $ne: null } },
            { _id: 1, offerLocked: 1, offerId: 1 }
        ).lean();

        const categoryBulk = [];

        for (let i = 0; i < subcategories.length; i++) {
            const category = subcategories[i];
            const categoryId = category._id.toString();

            // if manually locked, skip auto changing
            if (category.offerLocked) {
                continue;
            }

            const offers = categoryOfferMap.get(categoryId) || [];

            let bestOfferId = null;
            let bestValue = -1;

            for (let j = 0; j < offers.length; j++) {
                const offer = offers[j];

                let score = offer.discountValue;

                if (score > bestValue) {
                    bestValue = score;
                    bestOfferId = offer._id;
                }
            }

            categoryBulk.push({
                updateOne: {
                    filter: { _id: category._id },
                    update: {
                        $set: {
                            offerId: bestOfferId || null
                        }
                    }
                }
            });
        }

        if (categoryBulk.length > 0) {
            await Category.bulkWrite(categoryBulk, { ordered: false });
        }

        // product pricing
        const batchSize = 100;
        let lastId = null;

        while (true) {
            const query = lastId ? { _id: { $gt: lastId } } : {};

            const products = await Product.find(query)
                .sort({ _id: 1 })
                .limit(batchSize)
                .lean();

            if (products.length === 0) break;

            const bulkOps = [];

            for (let i = 0; i < products.length; i++) {
                const product = products[i];

                const productId = product._id.toString();
                const categoryId = product.categoryId.toString();

                const matchedOffers = [
                    ...(productOfferMap.get(productId) || []),
                    ...(categoryOfferMap.get(categoryId) || [])
                ];

                const updatedDetails = product.details.map(item => {
                    if (item.offerLocked) {
                        return item;
                    }

                    if (matchedOffers.length === 0) {
                        return {
                            ...item,
                            offerId: null,
                            offerPrice: 0
                        };
                    }

                    let bestPrice = item.price;
                    let bestOfferId = null;

                    for (let k = 0; k < matchedOffers.length; k++) {
                        const offer = matchedOffers[k];
                        let newPrice 

                        if (offer.discountType === "percentage") {
                            newPrice = item.price - (item.price * offer.discountValue) / 100;
                        } else {
                            newPrice = item.price - offer.discountValue;
                        }

                        if (newPrice <= 0) continue;
                        if (newPrice < item.price * 0.20) continue;

                        newPrice = Math.round(newPrice);

                        if (newPrice < bestPrice) {
                            bestPrice = newPrice;
                            bestOfferId = offer._id;
                        }
                    }

                    return {
                        ...item,
                        offerId: bestOfferId,
                        offerPrice: bestOfferId ? bestPrice : 0
                    };
                });

                const oldData = JSON.stringify(product.details);
                const newData = JSON.stringify(updatedDetails);

                if (oldData === newData) continue;

                bulkOps.push({
                    updateOne: {
                        filter: { _id: product._id },
                        update: { $set: { details: updatedDetails } }
                    }
                });
            }

            if (bulkOps.length > 0) {
                await Product.bulkWrite(bulkOps, { ordered: false });
            }

            lastId = products[products.length - 1]._id;
        }
};