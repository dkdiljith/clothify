const Order = require("../models/orderSchema");
const Product = require("../models/productSchema");
const Category = require("../models/categorySchema");
const User = require("../models/userSchema");

const ANALYTICS_STATUSES = ["Pending", "Shipped", "Completed", 'Return Requested', "Return Rejected"];

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
exports.dashboardRender = async (req, res) => {
    try {
        return res.render("admin/dashboard");
    } catch (error) {
        console.error("Dashboard Render Error:", error);
        return res.status(500).render("admin/error", {
            message: "Failed to load dashboard",
        });
    }
};




exports.getDashboardData = async (req, res) => {
    try {
        const allowedFilters = ["today", "week", "month", "year"];

        const filter = allowedFilters.includes(req.query.filter)
            ? req.query.filter
            : "month";

        const [statistics, revenueChart, topProducts, topCategories, paymentMethods] =
            await Promise.all([
                getStatistics(filter),
                getRevenueChart(filter),
                getTopProducts(filter),
                getTopCategories(filter),
                getPaymentMethods(filter),
            ]);
        return res.json({
            success: true,
            stats: statistics,
            revenueChart,
            products: topProducts,
            categories: topCategories,
            paymentMethods
        });
    } catch (error) {
        console.error("Dashboard Data Error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to fetch dashboard data.",
        });
    }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////




function getDateFilter(filter) {
    const now = new Date();
    let startDate;
    let endDate = new Date();
    switch (filter) {
        case "today":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case "week":
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);
            break;
        case "year":
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        case "month":
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
    }
    return {
        startDate,
        endDate,
    };
}



async function getStatistics(filter) {
    const { startDate, endDate } = getDateFilter(filter);

    const orders = await Order.find({
        createdAt: {
            $gte: startDate,
            $lte: endDate,
        },
        items: {
            $elemMatch: {
                status: {
                    $in: ["Returned", "Cancelled", ...ANALYTICS_STATUSES],
                },
            },
        },
    }).lean();

    let totalRevenue = 0;
    let totalOrders = 0;

    for (const order of orders) {
        let hasCompletedItem = false;
        for (const item of order.items) {
            if (isValidAnalyticsItem(order, item)) {
                totalRevenue += item.amount;
                hasCompletedItem = true;
            }
        }

        // Check if the payment method is COD (case-insensitive)
        const isCod = order.paymentMethod?.toLowerCase() === "cod";

        // Check if EVERY item inside this specific order has a "Pending" status
        const areAllItemsPending = order.items.every(item => item.status === "Pending");

        // Skip counting this order if it is COD and all its items are pending
        if (isCod && areAllItemsPending) {
            continue;
        }

        // Count every order except orders whose all items are Failed
        if (order.items.some(item => item.status !== "Failed")) {
            totalOrders++;
        }
    }

    const [users, products] = await Promise.all([
        User.countDocuments({ blocked: false, isActive: true }),
        Product.countDocuments({ isActive: true }),
    ]);

    return {
        revenue: Math.round(totalRevenue),
        orders: totalOrders,
        users,
        products,
    };
}



async function getRevenueChart(filter) {
    const { startDate, endDate } = getDateFilter(filter);
    let groupId;
    let labels = [];
    let data = [];
    switch (filter) {
        case "today":
            groupId = {
                $hour: {
                    date: "$createdAt",
                    timezone: "Asia/Kolkata"
                }
            };
            labels = Array.from(
                { length: 24 },
                (_, i) => `${String(i).padStart(2, "0")}:00`,
            );
            data = new Array(24).fill(0);
            break;
        case "week":
            groupId = {
                $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$createdAt",
                    timezone: "Asia/Kolkata"
                }
            };
            data = new Array(7).fill(0);
            for (let i = 0; i < 7; i++) {
                const current = new Date(startDate);
                current.setDate(startDate.getDate() + i);
                labels.push(
                    current.toLocaleDateString("en-IN", {
                        weekday: "short",
                    }),
                );
            }
            break;
        case "year":
            groupId = {
                $month: {
                    date: "$createdAt",
                    timezone: "Asia/Kolkata"
                }
            };
            labels = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
            ];
            data = new Array(12).fill(0);
            break;
        case "month":
        default:
            groupId = {
                $dayOfMonth: {
                    date: "$createdAt",
                    timezone: "Asia/Kolkata"
                }
            };
            const totalDays = new Date(
                startDate.getFullYear(),
                startDate.getMonth() + 1,
                0,
            ).getDate();
            labels = Array.from({ length: totalDays }, (_, i) => String(i + 1));
            data = new Array(totalDays).fill(0);
            break;
    }
    const revenue = await Order.aggregate([
        {
            $unwind: "$items",
        },
        {
            $match: {
                $or: [
                    // Razorpay & Wallet
                    {
                        paymentMethod: {
                            $in: ["razorpay", "wallet"],
                        },
                        "items.status": {
                            $in: ANALYTICS_STATUSES,
                        },
                    },
                    // COD
                    {
                        paymentMethod: "cod",
                        "items.status": {
                            $in: ["Completed", "Return Requested", "Return Rejected"],
                        },
                    },
                ]
            }
        },
        {
            $group: {
                _id: groupId,
                revenue: {
                    $sum: "$items.amount",
                },
            },
        },
        {
            $sort: {
                _id: 1,
            },
        },
    ]);
    switch (filter) {
        case "today":
            revenue.forEach((item) => {
                data[item._id] = item.revenue;
            });
            break;
        case "week":
            revenue.forEach((item) => {
                const orderDate = new Date(item._id);
                const difference = Math.floor(
                    (orderDate - startDate) / (1000 * 60 * 60 * 24),
                );
                if (difference >= 0 && difference < 7) {
                    data[difference] = item.revenue;
                }
            });
            break;
        case "year":
            revenue.forEach((item) => {
                data[item._id - 1] = item.revenue;
            });
            break;
        case "month":
        default:
            revenue.forEach((item) => {
                data[item._id - 1] = item.revenue;
            });
            break;
    }
    return {
        labels,
        data,
    };
}




async function getTopProducts(filter) {
    const { startDate, endDate } = getDateFilter(filter);
    return await Order.aggregate([
        {
            $unwind: "$items",
        },
        {
            $match: {
                $or: [
                    // Razorpay & Wallet
                    {
                        paymentMethod: {
                            $in: ["razorpay", "wallet"],
                        },
                        "items.status": {
                            $in: ANALYTICS_STATUSES,
                        },
                    },
                    // COD
                    {
                        paymentMethod: "cod",
                        "items.status": {
                            $in: ["Completed", "Return Requested", "Return Rejected"],
                        },
                    },
                ]
            }
        },

        {
            $group: {
                _id: "$items.productId",

                name: {
                    $first: "$items.productName",
                },

                sold: {
                    $sum: "$items.quantity",
                },

                revenue: {
                    $sum: "$items.amount",
                },
            },
        },
        {
            $sort: {
                sold: -1,
            },
        },
        {
            $limit: 10,
        },
    ]);
}




async function getTopCategories(filter) {
    const { startDate, endDate } = getDateFilter(filter);
    return await Order.aggregate([
        {
            $unwind: "$items",
        },
        {
            $match: {
                $or: [
                    // Razorpay & Wallet
                    {
                        paymentMethod: {
                            $in: ["razorpay", "wallet"],
                        },
                        "items.status": {
                            $in: ANALYTICS_STATUSES,
                        },
                    },
                    // COD
                    {
                        paymentMethod: "cod",
                        "items.status": {
                            $in: ["Completed", "Return Requested", "Return Rejected"],
                        },
                    },
                ]
            }
        },
        {
            $lookup: {
                from: "products",
                localField: "items.productId",
                foreignField: "_id",
                as: "product",
            },
        },
        {
            $unwind: "$product",
        },
        {
            $lookup: {
                from: "categories",
                localField: "product.categoryId",
                foreignField: "_id",
                as: "category",
            },
        },
        {
            $unwind: "$category",
        },
        {
            $group: {
                _id: "$category._id",

                name: {
                    $first: "$category.name",
                },

                sold: {
                    $sum: "$items.quantity",
                },

                revenue: {
                    $sum: "$items.amount",
                },
            }
        },
        {
            $sort: {
                sold: -1,
            },
        },
        {
            $limit: 10,
        },
    ]);
}



async function getPaymentMethods(filter) {
    const { startDate, endDate } = getDateFilter(filter);
    return await Order.aggregate([
        {
            $unwind: "$items"
        },
        {
            $match: {
                $or: [
                    // Razorpay & Wallet
                    {
                        paymentMethod: {
                            $in: ["razorpay", "wallet"],
                        },
                        "items.status": {
                            $in: ANALYTICS_STATUSES,
                        },
                    },
                    // COD
                    {
                        paymentMethod: "cod",
                        "items.status": {
                            $in: ["Completed", "Return Requested", "Return Rejected"],
                        },
                    },
                ]
            }
        },
        {
            $group: {
                _id: "$paymentMethod",
                revenue: {
                    $sum: "$items.amount"
                }
            }
        },
        {
            $sort: {
                revenue: -1
            }
        }
    ]);
}





function isValidAnalyticsItem(order, item) {
    if (!ANALYTICS_STATUSES.includes(item.status)) {
        return false;
    }
    if (
        order.paymentMethod === "cod" &&
        !["Completed", "Return Requested", "Return Rejected"].includes(item.status)
    ) {
        return false;
    }
    return true;
}
