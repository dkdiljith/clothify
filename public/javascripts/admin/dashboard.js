"use strict";
/* ==========================================================
                        GLOBALS
========================================================== */
let revenueChart;
let productChart;
let categoryChart;
const REFRESH_INTERVAL = 30000;
const dashboardLoading = document.getElementById("dashboardLoading");
const chartFilter = document.getElementById("chartFilter");
/* ==========================================================
                    DOM READY
========================================================== */
document.addEventListener("DOMContentLoaded", () => {
    initializeCharts();
    loadDashboard(chartFilter.value);
    chartFilter.addEventListener("change", () => {
        loadDashboard(chartFilter.value);
    });
    // Refresh every 30 seconds
    setInterval(() => {
        loadDashboard(chartFilter.value);
    }, REFRESH_INTERVAL);
});
/* ==========================================================
                    LOAD DASHBOARD
========================================================== */
async function loadDashboard(filter) {
    showLoading();
    try {
        const response = await fetch(
            `/admin/dashboard/data?filter=${filter}`
        );
        if (!response.ok) {
            throw new Error("Failed to load dashboard.");
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
            "sold"
        );
        updateBarChart(
            categoryChart,
            result.categories,
            "categoryChart",
            "categoryEmpty",
            "name",
            "sold"
        );
    }
    catch (error) {
        console.error(error);
    }
    finally {
        hideLoading();
    }
}
/* ==========================================================
                    METRIC CARDS
========================================================== */
function updateStatistics(stats) {
    document.getElementById("totalRevenue").textContent =
        `₹${Number(stats.revenue).toLocaleString("en-IN")}`;
    document.getElementById("totalOrders").textContent =
        stats.orders;
    document.getElementById("totalUsers").textContent =
        stats.users;
    document.getElementById("totalProducts").textContent =
        stats.products;
}
/* ==========================================================
                    METRIC SUBTITLE
========================================================== */
function updateMetricSubtitle(filter) {
    const labels = {
        today: "Today",
        week: "This Week",
        month: "This Month",
        year: "This Year"
    };
    document.getElementById("metricPeriodRevenue").textContent =
        labels[filter];
    document.getElementById("metricPeriodOrders").textContent =
        labels[filter];
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
    revenueChart = new Chart(
        document.getElementById("revenueChart"),
        {
            type: "line",
            data: {
                labels: [],
                datasets: [
                    {
                        label: "Revenue",
                        data: [],
                        borderColor: "#4f46e5",
                        backgroundColor: "rgba(79,70,229,0.15)",
                        pointBackgroundColor: "#4f46e5",
                        pointHoverBackgroundColor: "#4338ca",
                        borderWidth: 3,
                        fill: true,
                        tension: .35,
                        pointRadius: 4,
                        pointHoverRadius: 7
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 700
                },
                interaction: {
                    mode: "index",
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        }
    );
    productChart = createRankingChart("productChart");
    categoryChart = createRankingChart("categoryChart");
}
/* ==========================================================
                    RANKING CHART
========================================================== */
function createRankingChart(canvasId) {
    return new Chart(
        document.getElementById(canvasId),
        {
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
                            "#faf5ff"

                        ],
                        borderColor: "#1d4ed8",
                        hoverBackgroundColor: "#1e40af",
                    }
                ]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 700
                },
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true
                    }
                }
            }
        }
    );
}
/* ==========================================================
                    REVENUE CHART
========================================================== */
function updateRevenueChart(chartData) {
    const canvas = document.getElementById("revenueChart");
    const empty = document.getElementById("revenueEmpty");
    const hasData = chartData.data.some(value => value > 0);
    if (!hasData) {
        canvas.classList.add("d-none");
        empty.classList.remove("d-none");
        revenueChart.data.labels = [];
        revenueChart.data.datasets[0].data = [];
        revenueChart.update();
        return;
    }
    canvas.classList.remove("d-none");
    empty.classList.add("d-none");
    revenueChart.data.labels = chartData.labels;
    revenueChart.data.datasets[0].data = chartData.data;
    revenueChart.options.plugins.tooltip = {
        callbacks: {
            label(context) {
                return `Revenue : ₹${Number(
                    context.raw
                ).toLocaleString("en-IN")}`;
            }
        }
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
    valueKey
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
    chart.data.labels = chartData.map(item =>
        item.name.length > 18
            ? item.name.substring(0, 18) + "..."
            : item.name
    );
    chart.data.datasets[0].data =
        chartData.map(item => item[valueKey]);
    chart.options.plugins.tooltip = {
        callbacks: {
            title(context) {
                const index = context[0].dataIndex;
                return [
                    `🏆 Top ${index + 1}`,
                    chartData[index][labelKey]
                ];
            },
            label(context) {
                const index = context.dataIndex;
                return [
                    `Sold : ${chartData[index].sold}`,
                    `Revenue : ₹${Number(
                        chartData[index].revenue
                    ).toLocaleString("en-IN")}`
                ];
            }
        }
    };
    chart.update();
}
/* ==========================================================
                REFRESH WHEN TAB BECOMES ACTIVE
========================================================== */
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        loadDashboard(chartFilter.value);
    }
});
/* ==========================================================
                    WINDOW RESIZE
========================================================== */
window.addEventListener("resize", () => {
    revenueChart.resize();
    productChart.resize();
    categoryChart.resize();
});
/* ==========================================================
                    GLOBAL ERRORS
========================================================== */
window.addEventListener("unhandledrejection", event => {
    console.error(
        "Unhandled Promise Rejection:",
        event.reason
    );
});
window.addEventListener("error", event => {
    console.error(
        "JavaScript Error:",
        event.error
    );
});