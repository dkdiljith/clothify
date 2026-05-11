const models = {
    coupon: require('../models/couponSchema'),
    offer: require('../models/offerSchema'),
    product: require('../models/productSchema'),
    order: require('../models/orderSchema'),
    user: require('../models/userSchema'),
};

const searchableFields = {
    coupon: ['couponCode', 'discountType'],
    offer: ['offerCode', 'offerType', 'discountType'],
    product: ['name', 'description', 'gender'],
    order: ['orderId'],
    user: ['name', 'email', 'phone']
};

const responseKeys = {
    coupon: 'coupon',
    offer: 'offer',
    product: 'products',
    order: 'order',
    user: 'user'
};

const adminPaginationFactory = async ({
    page = 1,
    limit = 5,
    query = '',
    type
}) => {

    const Model = models[type];

    if (!Model) {
        throw new Error(`Invalid type: ${type}`);
    }

    const skip = (page - 1) * limit;
    let filter = {};

    if (query && searchableFields[type]) {

        filter = {
            $or: searchableFields[type].map(field => ({
                [field]: {
                    $regex: query,
                    $options: 'i'
                }
            }))
        };
    }

    const [totalDocuments, data] = await Promise.all([
        Model.countDocuments(filter),
        Model.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
    ]);

    const totalPages = Math.ceil(totalDocuments / limit);
    const responseKey = responseKeys[type];

    return {
        [responseKey]: data,
        query,
        pagination: {
            page,
            limit,
            totalPages,
            nextPage: page + 1,
            prevPage: page - 1,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    };
};



module.exports = adminPaginationFactory;