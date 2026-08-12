"use strict";
/* ==========================================================
                        GLOBALS
========================================================== */
let revenueChart;
let productChart;
let categoryChart;
let paymentChart;
let refreshTimer;
const REFRESH_INTERVAL = 30000;
const dashboardLoading = document.getElementById("dashboardLoading");
const chartFilter = document.getElementById("chartFilter");
/* ==========================================================
                    DOM READY
========================================================== */
document.addEventListener("DOMContentLoaded", () => {
    initializeCharts();
    loadDashboard(chartFilter.value, true);
    chartFilter.addEventListener("change", () => {
        loadDashboard(chartFilter.value, true);
        document.getElementById("lastUpdated").textContent =
            `Updated ${new Date().toLocaleTimeString("en-IN")}`;
    });
    startAutoRefresh();
    document.getElementById("lastUpdated").textContent =
        `Updated ${new Date().toLocaleTimeString("en-IN")}`;
});
/* ==========================================================
                    AUTO REFRESH
========================================================== */
function startAutoRefresh() {
    clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
        loadDashboard(chartFilter.value);
    }, REFRESH_INTERVAL);
}
function stopAutoRefresh() {
    clearInterval(refreshTimer);
}
/* ==========================================================
                    LOAD DASHBOARD
========================================================== */
async function loadDashboard(filter, showLoader = false) {
    if (showLoader) {
        showLoading();
    }
    try {
        const response = await fetch(`/admin/dashboard/data?filter=${filter}`);
        if (!response.ok) {
            throw new Error("Failed to fetch dashboard.");
        }
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message);
        }
        updateStatistics(result.stats);
        updateMetricSubtitle(filter);
        updateRevenueChart(result.revenueChart);
        updateBarChart(
            productChart,
            result.products,
            "productChart",
            "productEmpty",
            "name",
            "sold",
        );
        updateBarChart(
            categoryChart,
            result.categories,
            "categoryChart",
            "categoryEmpty",
            "name",
            "sold",
        );
        updatePaymentChart(result.paymentMethods);
        document.getElementById("lastUpdated").textContent =
            `Updated ${new Date().toLocaleTimeString("en-IN")}`;
    } finally {
        if (showLoader) {
            hideLoading();
        }
    }
}
/* ==========================================================
                    METRIC CARDS
========================================================== */
function updateStatistics(stats) {
    document.getElementById("totalRevenue").textContent = `₹${Number(
        stats.revenue,
    ).toLocaleString("en-IN")}`;
    document.getElementById("totalOrders").textContent = stats.orders;
    document.getElementById("totalUsers").textContent = stats.users;
    document.getElementById("totalProducts").textContent = stats.products;
}
/* ==========================================================
                    SUBTITLE
========================================================== */
function updateMetricSubtitle(filter) {
    const labels = {
        today: "Today",
        week: "This Week",
        month: "This Month",
        year: "This Year",
    };
    document.getElementById("metricPeriodRevenue").textContent = labels[filter];
    document.getElementById("metricPeriodOrders").textContent = labels[filter];
}
/* ==========================================================
                        LOADING
========================================================== */
function showLoading() {
    dashboardLoading.style.display = "flex";
}
function hideLoading() {
    dashboardLoading.style.display = "none";
}
/* ==========================================================
                INITIALIZE CHARTS
========================================================== */
function initializeCharts() {
    /* ---------------- Revenue ---------------- */
    revenueChart = new Chart(document.getElementById("revenueChart"), {
        type: "line",
        data: {
            labels: [],
            datasets: [
                {
                    label: "Revenue",
                    data: [],
                    borderColor: "#4f46e5",
                    backgroundColor: "rgba(79,70,229,.15)",
                    pointBackgroundColor: "#4f46e5",
                    pointHoverBackgroundColor: "#4338ca",
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    borderWidth: 3,
                    tension: 0.35,
                    fill: true,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                },
            },
            interaction: {
                intersect: false,
                mode: "index",
            },
            scales: {
                y: {
                    beginAtZero: true,
                },
            },
        },
    });
    /* ---------------- Products ---------------- */
    productChart = createRankingChart("productChart");
    /* ---------------- Categories ---------------- */
    categoryChart = createRankingChart("categoryChart");
    /* ---------------- Payments ---------------- */
    paymentChart = new Chart(document.getElementById("paymentChart"), {
        type: "doughnut",
        data: {
            labels: [],
            datasets: [
                {
                    data: [],
                    backgroundColor: ["#4f46e5", "#10b981", "#f59e0b"],
                    borderWidth: 0,
                    hoverOffset: 18,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "70%",
            plugins: {
                legend: {
                    position: "bottom",
                },
            },
        },
    });
}
/* ==========================================================
                RANKING CHART FACTORY
========================================================== */
function createRankingChart(canvasId) {
    return new Chart(document.getElementById(canvasId), {
        type: "bar",
        data: {
            labels: [],
            datasets: [
                {
                    label: "Sold",
                    data: [],
                    borderRadius: 8,
                    borderWidth: 1,
                    backgroundColor: [
                        "#4f46e5",
                        "#6366f1",
                        "#818cf8",
                        "#a5b4fc",
                        "#c7d2fe",
                        "#dbeafe",
                        "#e0e7ff",
                        "#eef2ff",
                        "#f5f3ff",
                        "#faf5ff",
                    ],
                    borderColor: "#4338ca",
                },
            ],
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                },
            },
            scales: {
                x: {
                    beginAtZero: true,
                },
            },
        },
    });
}
/* ==========================================================
                REVENUE CHART
========================================================== */
function updateRevenueChart(chartData) {
    revenueChart.data.labels = chartData.labels;
    revenueChart.data.datasets[0].data = chartData.data;
    revenueChart.options.plugins.tooltip = {
        callbacks: {
            label(context) {
                return `Revenue : ₹${Number(context.raw).toLocaleString("en-IN")}`;
            },
        },
    };
    revenueChart.options.scales.x.ticks.callback = function (value, index) {
        const filter = chartFilter.value;
        if (filter === "today") {
            return index % 2 === 0
                ? this.getLabelForValue(value)
                : "";
        }
        return this.getLabelForValue(value);
    };
    revenueChart.update();
}
/* ==========================================================
                BAR CHART
========================================================== */
function updateBarChart(
    chart,
    chartData,
    canvasId,
    emptyId,
    labelKey,
    valueKey,
) {
    const canvas = document.getElementById(canvasId);
    const empty = document.getElementById(emptyId);
    if (!chartData.length) {
        canvas.classList.add("d-none");
        empty.classList.remove("d-none");
        chart.data.labels = [];
        chart.data.datasets[0].data = [];
        chart.update();
        return;
    }
    canvas.classList.remove("d-none");
    empty.classList.add("d-none");
    chart.data.labels = chartData.map((item) =>
        item.name.length > 18 ? item.name.substring(0, 18) + "..." : item.name,
    );
    chart.data.datasets[0].data = chartData.map((item) => item[valueKey]);
    chart.options.plugins.tooltip = {
        callbacks: {
            title(context) {
                const index = context[0].dataIndex;
                return chartData[index][labelKey];
            },
            label(context) {
                const index = context.dataIndex;
                return [
                    `Sold : ${chartData[index].sold}`,
                    `Revenue : ₹${Number(chartData[index].revenue).toLocaleString(
                        "en-IN",
                    )}`,
                ];
            },
        },
    };
    chart.update();
}
/* ==========================================================
                PAYMENT CHART
========================================================== */
function updatePaymentChart(chartData) {
    if (!chartData) return;
    paymentChart.data.labels = chartData.map((item) => item._id.toUpperCase());
    paymentChart.data.datasets[0].data = chartData.map((item) => item.revenue);
    paymentChart.options.plugins.tooltip = {
        callbacks: {
            label(context) {
                const total = chartData.reduce((sum, item) => sum + item.revenue, 0);
                const value = context.raw;
                const percentage = ((value / total) * 100).toFixed(1);
                return [
                    `Revenue : ₹${Number(value).toLocaleString("en-IN")}`,
                    `Share : ${percentage}%`,
                ];
            },
        },
    };
    paymentChart.update();
}
/* ==========================================================
                REFRESH WHEN TAB BECOMES ACTIVE
========================================================== */
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        stopAutoRefresh();
    } else {
        loadDashboard(chartFilter.value);
        startAutoRefresh();
    }
});

