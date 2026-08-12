document.addEventListener('DOMContentLoaded', () => {

    const themeToggles =
        document.querySelectorAll('.theme-toggle-btn');

    const root = document.documentElement;


    // =====================================================
    // THEME BUTTON TEXT UPDATE
    // =====================================================

    function updateButtonText() {

        const currentTheme =
            root.getAttribute('data-theme');

        themeToggles.forEach(button => {

            const span = button.querySelector('span');

            if (span) {

                span.textContent =
                    currentTheme === 'dark'
                        ? 'Light Mode'
                        : 'Dark Mode';

            } else {

                button.textContent =
                    currentTheme === 'dark'
                        ? '☀️ Light Mode'
                        : '🌓 Dark Mode';
            }

        });

    }


    // =====================================================
    // THEME TOGGLE
    // =====================================================

    if (themeToggles.length > 0) {

        updateButtonText();

        themeToggles.forEach(button => {

            button.addEventListener('click', () => {

                const currentTheme =
                    root.getAttribute('data-theme');

                const newTheme =
                    currentTheme === 'dark'
                        ? 'light'
                        : 'dark';

                root.setAttribute('data-theme', newTheme);

                localStorage.setItem('theme', newTheme);

                updateButtonText();

            });

        });

    }


    // =====================================================
    // SIDEBAR TOGGLE
    // =====================================================

    const sidebar = document.querySelector('.sidebar');

    const sidebarToggle =
        document.getElementById('adminSidebarToggle');

    const sidebarOverlay =
        document.getElementById('sidebarOverlay');

    if (sidebar && sidebarToggle && sidebarOverlay) {

        sidebarToggle.addEventListener('click', () => {

            sidebar.classList.add('show-sidebar');

            sidebarOverlay.classList.add('show-overlay');

            document.body.style.overflow = 'hidden';

        });

        sidebarOverlay.addEventListener('click', () => {

            sidebar.classList.remove('show-sidebar');

            sidebarOverlay.classList.remove('show-overlay');

            document.body.style.overflow = '';

        });

    }

});