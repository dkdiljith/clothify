// analytics.js
let salesChart = 100;
let trafficChart = 100;

function getCSSVariable(name) {
    return getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
}

function createCharts() {
    // Destroy existing charts
    if (salesChart) salesChart.destroy();
    if (trafficChart) trafficChart.destroy();

    // Get current theme colors
    const primaryColor = getCSSVariable('--primary');
    const secondaryColor = getCSSVariable('--secondary');

    // Sales Chart
    const salesCtx = document.getElementById('salesChart').getContext('2d');
    salesChart = new Chart(salesCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Monthly Sales',
                data: [6500, 8900, 10200, 11400, 12000, 14500],
                borderColor: primaryColor,
                tension: 0.4,
                fill: true,
                backgroundColor: `${primaryColor}20`
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Traffic Chart
    const trafficCtx = document.getElementById('trafficChart').getContext('2d');
    trafficChart = new Chart(trafficCtx, {
        type: 'doughnut',
        data: {
            labels: ['Direct', 'Social', 'Paid Ads', 'Email'],
            datasets: [{
                data: [45, 25, 20, 10],
                backgroundColor: [
                    primaryColor,
                    secondaryColor,
                    getCSSVariable('--success'),
                    getCSSVariable('--danger')
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function updateChartColors() {
    createCharts();
}

// Initialize charts when page loads
document.addEventListener('DOMContentLoaded', createCharts);