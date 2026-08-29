import * as dashboardService from '../services/dashboardService.js'; 

//MESSAGE_CONSTANTS
import DASHBOARD_MESSAGES from '../constants/dashboard.js';
import STATUS_CODES from '../constants/status-codes.js';


////////////////////////////////////////////////////////////////////////////////////////////////////////////////


export const dashboardRender = async (req, res) => {
    try {
        return res.render("admin/dashboard");
    } catch  {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).render("admin/error", {
            message: DASHBOARD_MESSAGES.FAILED_RENDER,
        }); 
    }
};

export const getDashboardData = async (req, res) => {
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
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: DASHBOARD_MESSAGES.FAILED_FETCH,
        });
    }
};