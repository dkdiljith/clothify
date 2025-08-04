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

                    const confirmed = confirm(
                        "⚠️ Are you sure you want to delete this category?\n\n" +
                        "🔸 This action will also delete all subcategories under it.\n" +
                        "🔸 It can affect all products that are using this category.\n\n" +
                        "🚫 This action cannot be undone!"
                    );
                    if (!confirmed) return;

                    alert("⏳ Deleting the category... Please wait.");

                    try {
                        const response = await fetch(`/admin/category/${categoryId}`, {
                            method: 'DELETE'
                        });

                        if (response.ok) {
                            alert("✅ Category and its subcategories deleted successfully!");
                            location.reload();
                        } else {
                            const errorData = await response.json();
                            alert("❌ Failed to delete: " + errorData.message);
                        }
                    } catch (error) {
                        alert("🚫 Error occurred: " + error.message);
                    }
                });
            });
        });