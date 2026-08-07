document.addEventListener('DOMContentLoaded', function () {

    // MOBILE FILTER
    const mobileFilterToggle =
        document.querySelector(
            '.mobile-filter-toggle'
        );

    const filterSidebar =
        document.querySelector(
            '.filter-sidebar'
        );


    if (
        mobileFilterToggle &&
        filterSidebar
    ) {

        mobileFilterToggle.addEventListener(
            'click',
            function () {

                filterSidebar.classList.toggle(
                    'show'
                );

            }
        );

    }

});
