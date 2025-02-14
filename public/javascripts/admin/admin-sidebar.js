// Theme Toggle Logic (keep this in your HTML file)
const themeToggle = document.getElementById('theme-toggle');
const root = document.documentElement;

// Initialize theme
const savedTheme = localStorage.getItem('theme') || 'light';
root.setAttribute('data-theme', savedTheme);
updateButtonText();

themeToggle.addEventListener('click', () => {
    const currentTheme = root.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    root.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateButtonText();
    updateChartColors(); // Calls function from analytics.js
});

function updateButtonText() {
    const currentTheme = root.getAttribute('data-theme');
    themeToggle.textContent = currentTheme === 'dark' ? '☀️ Light Mode' : '🌓 Dark Mode';
}



document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("search-input");
    const genderFilter = document.getElementById("gender-filter"); // Dropdown for gender
    const categoryFilter = document.getElementById("category-filter"); // Dropdown for subcategories
    const parentCategoryFilter = document.getElementById("parent-category-filter"); // Dropdown for parent categories
    const productContainer = document.querySelector(".isotope-grid"); // Where products are displayed

    async function fetchProducts() {
        let search = searchInput.value;
        let gender = genderFilter.value;
        let categoryId = categoryFilter.value;
        let parentCategoryId = parentCategoryFilter.value;

        let query = new URLSearchParams();
        if (search) query.append("search", search);
        if (gender) query.append("gender", gender);
        if (categoryId) query.append("categoryId", categoryId);
        if (parentCategoryId) query.append("parentCategoryId", parentCategoryId);

        try {
            const response = await fetch(`/api/products?${query.toString()}`);
            const products = await response.json();
            renderProducts(products);
        } catch (error) {
            console.error("Error fetching products:", error);
        }
    }

    function renderProducts(products) {
        productContainer.innerHTML = ""; // Clear previous results
        products.forEach(product => {
            let productHTML = `
                <div class="col-sm-6 col-md-4 col-lg-3 p-b-35 isotope-item">
                    <div class="card">
                        <div class="block2-pic hov-img0">
                            <img src="${product.images[0]?.path}" alt="${product.name}" class="card-img-top fixed-image">
                            <a href="#" class="block2-btn flex-c-m stext-103 cl2 size-102 bg0 bor2 hov-btn1 p-lr-15 trans-04">
                                Quick View
                            </a>
                        </div>
                        <div class="card-body">
                            <h5 class="card-title"><a href="/product/${product._id}" class="stext-104 cl4 hov-cl1 trans-04 js-name-b2">
                                ${product.name}
                            </a></h5>
                            <p class="card-text stext-105 cl3">$${product.details[0]?.price}</p>
                        </div>
                    </div>
                </div>`;
            productContainer.innerHTML += productHTML;
        });
    }

    // Event Listeners for filters
    searchInput.addEventListener("input", fetchProducts);
    genderFilter.addEventListener("change", fetchProducts);
    categoryFilter.addEventListener("change", fetchProducts);
    parentCategoryFilter.addEventListener("change", fetchProducts);

    fetchProducts(); // Load products initially
});
