document.addEventListener('DOMContentLoaded', function () {

    // Search functionality
    document.querySelector('.search-input').addEventListener('input', function (e) {
        const searchTerm = e.target.value.toLowerCase();
        const orderCards = document.querySelectorAll('.order-card');

        orderCards.forEach(card => {
            const orderText = card.textContent.toLowerCase();
            if (orderText.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });

    // Filter button functionality
    document.querySelector('.filter-button').addEventListener('click', function () {
        // This would open a filter modal in a real implementation
        alert('Filter functionality would open a filter dialog here');
    });

})