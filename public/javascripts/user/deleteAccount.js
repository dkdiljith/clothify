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

    // Declared as an async function to use await on our custom confirmation modal
    async function confirmAccountDeletion() {
        // 1. Replaced native confirm() with custom center 'danger' modal window
        const confirmed = await showCustomConfirm(
            "Delete Account?",
            "Are you absolutely sure you want to delete your account?\n\nThis action cannot be undone.",
            "danger"
        );
        if (!confirmed) return;

        // Show loading state inline on the page button layout
        const deleteButton = document.getElementById('deleteButton');
        deleteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        deleteButton.disabled = true;

        // Submit deletion request
        fetch('/user/deleteuseraccount', {
            method: 'POST',
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
        .then(async (data) => {
            if (data.success) {
                // 2. Replaced native success alert with custom center 'success' modal window
                await showCustomConfirm(
                    "Account Scheduled for Deletion",
                    "Your account has been scheduled for deletion. You will be logged out shortly.",
                    "success"
                );
                window.location.href = '/user/login';
            } else {
                // 3. Replaced native error alert with custom center 'warning' modal window
                await showCustomConfirm(
                    "Deletion Failed",
                    data.message || "Account deletion failed. Please try again.",
                    "warning"
                );
                deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i> Delete Account Permanently';
                deleteButton.disabled = false;
            }
        })
        .catch(async (error) => {
            console.error('Error:', error);
            // 4. Replaced native catch network error alert with custom center 'danger' modal window
            await showCustomConfirm(
                "System Error",
                "An error occurred during account deletion. Please try again.",
                "danger"
            );
            deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i> Delete Account Permanently';
            deleteButton.disabled = false;
        });
    }

});
