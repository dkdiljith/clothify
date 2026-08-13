const Order = require("../models/orderSchema");
const Product = require("../models/productSchema");
const User = require("../models/userSchema");
const ANALYTICS_STATUSES = [
  "Pending",
  "Shipped",
  "Completed",
  "Return Requested",
  "Return Rejected",
];
///////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Helper function to build date range filters for aggregation and queries

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
  return { startDate, endDate };
}





function isValidAnalyticsItem(order, item) {
  if (!ANALYTICS_STATUSES.includes(item.status)) {
    return false;
  }
  if (
    order.paymentMethod?.toLowerCase() === "cod" &&
    !["Completed", "Return Requested", "Return Rejected"].includes(item.status)
  ) {
    return false;
  }
  return true;
}





// Reusable match stage for analytics queries filtered by date range
const getAnalyticsMatchStage = (startDate, endDate) => ({
  createdAt: { $gte: startDate, $lte: endDate },
  $or: [
    {
      paymentMethod: { $in: ["razorpay", "wallet"] },
      "items.status": { $in: ANALYTICS_STATUSES },
    },
    {
      paymentMethod: "cod",
      "items.status": {
        $in: ["Completed", "Return Requested", "Return Rejected"],
      },
    },
  ],
});





exports.getStatisticsData = async (filter) => {
  const { startDate, endDate } = getDateFilter(filter);
  const orders = await Order.find({
    createdAt: { $gte: startDate, $lte: endDate },
    items: {
      $elemMatch: {
        status: { $in: ["Returned", "Cancelled", ...ANALYTICS_STATUSES] },
      },
    },
  }).lean();
  let totalRevenue = 0;
  let totalOrders = 0;
  let pendingCodOrders = 0;
  for (const order of orders) {
    for (const item of order.items) {
      if (isValidAnalyticsItem(order, item)) {
        totalRevenue += item.amount;
      }
    }
    const isCod = order.paymentMethod?.toLowerCase() === "cod";
    const areAllItemsPending = order.items.every((item) =>
      ["Pending", "Shipped"].includes(item.status),
    );
    if (isCod && areAllItemsPending) {
      pendingCodOrders++;
      continue;
    }
    if (order.items.some((item) => item.status !== "Failed")) {
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
    pendingCodOrders,
    users,
    products,
  };
};




exports.getRevenueChartData = async (filter) => {
  const { startDate } = getDateFilter(filter);
  let groupId;
  let labels = [];
  let data = [];
  switch (filter) {
    case "today":
      groupId = { $hour: { date: "$createdAt", timezone: "Asia/Kolkata" } };
      labels = Array.from(
        { length: 24 },
        (_, i) => `${String(i).padStart(2, "0")}:00`,
      );
      data = new Array(24).fill(0);
      break;
    case "week": { // 💡 Added block scope braces here
      groupId = {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$createdAt",
          timezone: "Asia/Kolkata",
        },
      };
      data = new Array(7).fill(0);
      for (let i = 0; i < 7; i++) {
        const current = new Date(startDate);
        current.setDate(startDate.getDate() + i);
        labels.push(current.toLocaleDateString("en-IN", { weekday: "short" }));
      }
      break;
    }
    case "year":
      groupId = { $month: { date: "$createdAt", timezone: "Asia/Kolkata" } };
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
    default: { // 💡 Added block scope braces here to fix line 180
      groupId = {
        $dayOfMonth: { date: "$createdAt", timezone: "Asia/Kolkata" },
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
  }
  const { endDate } = getDateFilter(filter);
  const revenue = await Order.aggregate([
    { $match: getAnalyticsMatchStage(startDate, endDate) },
    { $unwind: "$items" },
    // Re-apply match post-unwind to safely target specific item metrics for chosen payment methods
    {
      $match: {
        $or: [
          {
            paymentMethod: { $in: ["razorpay", "wallet"] },
            "items.status": { $in: ANALYTICS_STATUSES },
          },
          {
            paymentMethod: "cod",
            "items.status": {
              $in: ["Completed", "Return Requested", "Return Rejected"],
            },
          },
        ],
      },
    },
    { $group: { _id: groupId, revenue: { $sum: "$items.amount" } } },
    { $sort: { _id: 1 } },
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
  return { labels, data };
};




exports.getTopProductsData = async (filter) => {
  const { startDate, endDate } = getDateFilter(filter);
  return await Order.aggregate([
    { $match: getAnalyticsMatchStage(startDate, endDate) },
    { $unwind: "$items" },
    {
      $match: {
        $or: [
          {
            paymentMethod: { $in: ["razorpay", "wallet"] },
            "items.status": { $in: ANALYTICS_STATUSES },
          },
          {
            paymentMethod: "cod",
            "items.status": {
              $in: ["Completed", "Return Requested", "Return Rejected"],
            },
          },
        ],
      },
    },
    {
      $group: {
        _id: "$items.productId",
        name: { $first: "$items.productName" },
        sold: { $sum: "$items.quantity" },
        revenue: { $sum: "$items.amount" },
      },
    },
    { $sort: { sold: -1 } },
    { $limit: 10 },
  ]);
};





exports.getTopCategoriesData = async (filter) => {
  const { startDate, endDate } = getDateFilter(filter);
  return await Order.aggregate([
    { $match: getAnalyticsMatchStage(startDate, endDate) },
    { $unwind: "$items" },
    {
      $match: {
        $or: [
          {
            paymentMethod: { $in: ["razorpay", "wallet"] },
            "items.status": { $in: ANALYTICS_STATUSES },
          },
          {
            paymentMethod: "cod",
            "items.status": {
              $in: ["Completed", "Return Requested", "Return Rejected"],
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "items.productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $lookup: {
        from: "categories",
        localField: "product.categoryId",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: "$category" },
    {
      $group: {
        _id: "$category._id",
        name: { $first: "$category.name" },
        sold: { $sum: "$items.quantity" },
        revenue: { $sum: "$items.amount" },
      },
    },
    { $sort: { sold: -1 } },
    { $limit: 10 },
  ]);
};
exports.getPaymentMethodsData = async (filter) => {
  const { startDate, endDate } = getDateFilter(filter);
  return await Order.aggregate([
    { $match: getAnalyticsMatchStage(startDate, endDate) },
    { $unwind: "$items" },
    {
      $match: {
        $or: [
          {
            paymentMethod: { $in: ["razorpay", "wallet"] },
            "items.status": { $in: ANALYTICS_STATUSES },
          },
          {
            paymentMethod: "cod",
            "items.status": {
              $in: ["Completed", "Return Requested", "Return Rejected"],
            },
          },
        ],
      },
    },
    {
      $group: {
        _id: "$paymentMethod",
        revenue: { $sum: "$items.amount" },
      },
    },
    { $sort: { revenue: -1 } },
  ]);
};
