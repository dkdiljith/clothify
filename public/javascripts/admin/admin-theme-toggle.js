document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const root = document.documentElement;

    // Guard clause: If the button doesn't exist on this specific page (like the Login page), stop running
    if (!themeToggle) return;

    // Sync the button text to match the theme applied by the head tag
    updateButtonText();

    themeToggle.addEventListener('click', () => {
        const currentTheme = root.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        root.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateButtonText();

        // Optional: wrap inside a safety check if analytics isn't loaded yet
        if (typeof updateChartColors === 'function') {
            updateChartColors();
        }
    });

    function updateButtonText() {
        const currentTheme = root.getAttribute('data-theme');
        themeToggle.textContent = currentTheme === 'dark' ? '☀️ Light Mode' : '🌓 Dark Mode';
    }
});
