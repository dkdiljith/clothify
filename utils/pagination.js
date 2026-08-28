import coupon from '../models/couponSchema.js';
import offer from '../models/offerSchema.js';
import product from '../models/productSchema.js';
import order from '../models/orderSchema.js';
import user from '../models/userSchema.js';

const models = {
    coupon,
    offer,
    product,
    order,
    user,
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
            hasPrevPage: page > 1,
            serialNumberStart: (page - 1) * limit 
        }
    };
};



module.exports = adminPaginationFactory;