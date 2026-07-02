document.addEventListener('DOMContentLoaded', () => {

    const deleteButton = document.getElementById('deleteButton');
    const confirmCheckbox = document.getElementById('confirmDeletion');


    if (confirmCheckbox && deleteButton) {
        confirmCheckbox.addEventListener('change', (event) => {
            deleteButton.disabled = !event.target.checked;
        });
    }

    if (deleteButton) {
        deleteButton.addEventListener('click', () => {
            confirmAccountDeletion();
        });
    }

    function toggleDeleteButton() {
        const confirmCheckbox = document.getElementById('confirmDeletion');
        const deleteButton = document.getElementById('deleteButton');
        deleteButton.disabled = !confirmCheckbox.checked;
    }

    function confirmAccountDeletion() {
        if (confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.')) {
            // Show loading state
            const deleteButton = document.getElementById('deleteButton');
            deleteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
            deleteButton.disabled = true;

            // Submit deletion request
            // Change method to POST
            fetch('/user/deleteuseraccount', {
                method: 'POST', // Changed from GET
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ confirm: true })
            })

                .then(response => {
                    if (response.ok) {
                        return response.json();
                    }
                    throw new Error('Deletion failed');
                })
                .then(data => {
                    if (data.success) {
                        alert('Your account has been scheduled for deletion. You will be logged out shortly.');
                        window.location.href = '/user/login';
                    } else {
                        alert(data.message || 'Account deletion failed. Please try again.');
                        deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i> Delete Account Permanently';
                        deleteButton.disabled = false;
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred during account deletion. Please try again.');
                    deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i> Delete Account Permanently';
                    deleteButton.disabled = false;
                });
        }
    }

})