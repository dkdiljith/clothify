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
