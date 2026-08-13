
const dashboardService = require('../services/dashboardService');

////////////////////////////////////////////////////////////////////////////////////////////////////////////////


exports.dashboardRender = async (req, res) => {
    try {
        return res.render("admin/dashboard");
    } catch  {
        return res.status(500).render("admin/error", {
            message: "Failed to load dashboard",
        });
    }
};

exports.getDashboardData = async (req, res) => {
    try {
        const allowedFilters = ["today", "week", "month", "year"];
        const filter = allowedFilters.includes(req.query.filter) ? req.query.filter : "month";

        const [statistics, revenueChart, topProducts, topCategories, paymentMethods] =
            await Promise.all([
                dashboardService.getStatisticsData(filter),
                dashboardService.getRevenueChartData(filter),
                dashboardService.getTopProductsData(filter),
                dashboardService.getTopCategoriesData(filter),
                dashboardService.getPaymentMethodsData(filter),
            ]);

        return res.json({
            success: true,
            stats: statistics,
            revenueChart,
            products: topProducts,
            categories: topCategories,
            paymentMethods,
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: "Unable to fetch dashboard data.",
        });
    }
};