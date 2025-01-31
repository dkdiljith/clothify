const categories = [
    { id: 1, name: "Electronics", parent: null, description: "Tech gadgets", status: "active" },
    { id: 2, name: "Clothing", parent: null, description: "Apparel", status: "active" },
    { id: 3, name: "Televisions", parent: 1, description: "TV sets", status: "active" }, // Subcategory
    // ... more categories
];

const tableBody = document.getElementById("category-table-body");
const addCategoryButton = document.getElementById("add-category-button");
const categoryModal = document.getElementById("category-modal");
const closeButton = document.querySelector(".close-button");
const categoryForm = document.getElementById("category-form");
const categoryIdInput = document.getElementById("category-id");
const categoryNameInput = document.getElementById("category-name");
const parentCategorySelect = document.getElementById("parent-category");
const categoryDescriptionInput = document.getElementById("category-description");
const categoryStatusSelect = document.getElementById("category-status");

function renderCategories() {
    tableBody.innerHTML = ""; // Clear table
    parentCategorySelect.innerHTML = "<option value=''>None</option>"; // Reset parent options

    categories.forEach(category => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${category.id}</td>
            <td>${category.name}</td>
            <td>${category.parent ? categories.find(c => c.id === category.parent)?.name : 'None'}</td>
            <td>${category.description}</td>
            <td>${category.status}</td>
            <td>
                <button class="edit-button" data-id="${category.id}">Edit</button>
                <button class="delete-button" data-id="${category.id}">Delete</button>
            </td>
        `;

        // Add parent category options (excluding the current category)
        if (!category.parent) {  //Only adds top level categories to the parent select
            const option = document.createElement("option");
            option.value = category.id;
            option.text = category.name;
            parentCategorySelect.add(option);
        }

        // Add event listeners to the buttons
        row.querySelector(".edit-button").addEventListener("click", () => openModal(category));
        row.querySelector(".delete-button").addEventListener("click", () => deleteCategory(category.id));

    });
}


function openModal(category = null) {
    categoryModal.style.display = "block";

    if (category) { // Editing existing category
        categoryIdInput.value = category.id;
        categoryNameInput.value = category.name;
        parentCategorySelect.value = category.parent || "";
        categoryDescriptionInput.value = category.description;
        categoryStatusSelect.value = category.status;
    } else {  // Adding new category
        categoryIdInput.value = "";
        categoryNameInput.value = "";
        parentCategorySelect.value = "";
        categoryDescriptionInput.value = "";
        categoryStatusSelect.value = "active";
    }
}

function closeModal() {
    categoryModal.style.display = "none";
}

addCategoryButton.addEventListener("click", () => openModal());
closeButton.addEventListener("click", closeModal);

categoryForm.addEventListener("submit", (event) => {
    event.preventDefault();  // Prevent form from actually submitting

    const id = categoryIdInput.value;
    const name = categoryNameInput.value;
    const parent = parentCategorySelect.value || null;
    const description = categoryDescriptionInput.value;
    const status = categoryStatusSelect.value;

    if (id) { // Update existing category
      const index = categories.findIndex(c => c.id == id);
      if (index !== -1) {
        categories[index] = { id: parseInt(id), name, parent: parent ? parseInt(parent) : null, description, status };
      }
    } else { // Add new category
        const newId = categories.length > 0 ? Math.max(...categories.map(c => c.id)) + 1 : 1;
        categories.push({ id: newId, name, parent: parent ? parseInt(parent) : null, description, status });
    }

    renderCategories();
    closeModal();

});

function deleteCategory(id) {
    if (confirm("Are you sure you want to delete this category?")) {
        const index = categories.findIndex(c => c.id === id);
        if (index !== -1) {
            categories.splice(index, 1);
            renderCategories();
        }
    }
}

renderCategories(); // Initial rendering