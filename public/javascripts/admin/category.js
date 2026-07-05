document.addEventListener('DOMContentLoaded', function() {
    // Form validation
    const form = document.getElementById('addCategoryForm');
    const categoryNameInput = document.getElementById('categoryName');
    const categoryNameError = document.getElementById('categoryNameError');

    function validateCategoryName() {
        const value = categoryNameInput.value.trim();
        
        if (value === '') {
            categoryNameError.textContent = 'Category name is required';
            categoryNameError.style.display = 'block';
            categoryNameInput.classList.add('error');
            return false;
        }
        
        if (value.length < 6) {
            categoryNameError.textContent = 'Category name must be at least 6 characters long';
            categoryNameError.style.display = 'block';
            categoryNameInput.classList.add('error');
            return false;
        }
        
        categoryNameError.style.display = 'none';
        categoryNameInput.classList.remove('error');
        return true;
    }

    // Real-time validation
    categoryNameInput.addEventListener('input', function() {
        validateCategoryName();
    });

    // Form submission validation
    form.addEventListener('submit', function(e) {
        if (!validateCategoryName()) {
            e.preventDefault();
            categoryNameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            categoryNameInput.focus();
        }
    });

    // Delete category functionality
    const deleteButtons = document.querySelectorAll('.btn-delete');
    deleteButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const categoryId = button.getAttribute('data-id');

            // 1. Double-button choice modal ('danger' automatically adds Cancel)
            const confirmed = await showCustomConfirm(
                "Delete Category?",
                "Are you sure you want to delete this category?\n\n" +
                "This action will also delete all subcategories under it.\n" +
                "It can affect all products that are using this category.\n\n" +
                "This action cannot be undone!",
                "danger"
            );
            if (!confirmed) return;
            
            // Optional: Hide the action footer entirely only during active loading
            const actionFooter = document.querySelector('.modal-backdrop.modal-active .modal-actions-layout');
            if (actionFooter) actionFooter.style.display = 'none';

            try {
                const response = await fetch(`/admin/category/${categoryId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    // 3. Success modal ('success' automatically shows only the OK button)
                    await showCustomConfirm(
                        "Success", 
                        "Category and its subcategories deleted successfully!", 
                        "success"
                    );
                    location.reload();
                } else {
                    const errorData = await response.json();
                    // 4. Warning modal if the database rejects the delete
                    await showCustomConfirm(
                        "Deletion Failed", 
                        `Failed to delete: ${errorData.message}`, 
                        "warning"
                    );
                }
            } catch (error) {
                // 5. Danger modal for catastrophic network issues
                await showCustomConfirm(
                    "Network Error", 
                    `Error occurred: ${error.message}`, 
                    "danger"
                );
            }
        });
    });
});
