document.addEventListener('DOMContentLoaded', () => {

    const deleteButtons = document.querySelectorAll('.delete-btn');

    deleteButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const id = event.currentTarget.getAttribute('data-id');
            confirmDelete(id);
        });
    });

    function confirmDelete(addressId) {
        if (confirm('Are you sure you want to delete this address?')) {
            window.location.href = `/user/deleteaddress/${addressId}`;
        }
    }

})