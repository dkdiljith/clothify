document.addEventListener("DOMContentLoaded", () => {
    const deleteButtons = document.querySelectorAll('.btn-delete');

    deleteButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const categoryId = button.getAttribute('data-id');

            // ✅ Strong warning confirmation
            const confirmed = confirm(
                "⚠️ Are you sure you want to delete this sub category?\n\n" +
                "🔸 It can affect all products that are using this sub category.\n\n" +
                "🚫 This action cannot be undone!"
            );
            if (!confirmed) return;

            // ✅ Optional: Alert while deleting
            alert("⏳ Deleting the sub category... Please wait.");

            try {
                const response = await fetch(`/admin/category/${categoryId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    alert("✅ Sub Categories deleted successfully!");
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


    const form = document.querySelector('.form');
    const categoryNameInput = document.getElementById('categoryName');
    const subcategoryInput = document.getElementById('newSubcategory');

    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // prevent form submission

        const name = categoryNameInput.value.trim();
        const newSubcategory = subcategoryInput.value.trim();

        // Extract category ID from the current URL (editCategory/:id)
        const categoryId = window.location.pathname.split('/').pop();

        try {
            const response = await fetch(`/admin/category/${categoryId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, newSubcategory })
            });

            if (response.ok) {
                alert("✅ Category updated successfully!");
                location.reload();
            } else {
                const errorData = await response.json();
                alert("❌ Failed to update: " + errorData.message);
            }

        } catch (error) {
            console.error("🚫 Error updating category:", error);
            alert("Something went wrong.");
        }
    });




    //code should be inside this
});
