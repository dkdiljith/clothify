
// Coupon Data (Mock Data for Demo)
let coupons = [
    {
        id: 1,
        code: "SUMMER20",
        discountType: "percentage",
        discountValue: 20,
        minPurchase: 50,
        startDate: "2023-08-01",
        endDate: "2023-08-31",
        status: "active"
    },
    {
        id: 2,
        code: "FREESHIP",
        discountType: "fixed",
        discountValue: 0,
        minPurchase: 100,
        startDate: "2023-08-01",
        endDate: "2023-08-15",
        status: "expired"
    }
];

// Load Coupons into Table
function loadCoupons() {
    const tableBody = document.getElementById('couponsTable');
    tableBody.innerHTML = coupons.map((coupon, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${coupon.code}</td>
            <td>${coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `$${coupon.discountValue}`}</td>
            <td>${coupon.startDate} to ${coupon.endDate}</td>
            <td><span class="status">${coupon.status}</span></td>
            <td>
                <button class="btn btn-danger" onclick="deleteCoupon(${coupon.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Add Coupon
document.getElementById('couponForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const newCoupon = {
        id: coupons.length + 1,
        code: document.getElementById('couponCode').value,
        discountType: document.getElementById('discountType').value,
        discountValue: parseFloat(document.getElementById('discountValue').value),
        minPurchase: parseFloat(document.getElementById('minPurchase').value) || 0,
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        status: "active"
    };
    coupons.push(newCoupon);
    loadCoupons();
    e.target.reset();
});

// Delete Coupon
function deleteCoupon(id) {
    coupons = coupons.filter(coupon => coupon.id !== id);
    loadCoupons();
}

// Load coupons on page load
loadCoupons();