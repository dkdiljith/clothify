

const editButtons = document.querySelectorAll('.edit-button');
const modalBody = document.getElementById('modalBody');
const saveChangesButton = document.getElementById('saveChanges');


editButtons.forEach(button => {
  button.addEventListener('click', () => {
    const categoryId = button.dataset.id;
    const categoryName = button.dataset.name;
    const parentCategoryId = button.dataset.parent;

    // Fetch subcategories (replace with your actual API endpoint)
    fetch(`/admin/category/getSubcategories/${categoryId}`) // Example API endpoint
      .then(response => response.json())
      .then(subcategories => {
        let modalContent = `<h3>${categoryName}</h3>`;

        if (subcategories.length === 0) {
          modalContent += "<p>No subcategories found.</p>";
        } else {
           modalContent += "<ul>";
          subcategories.forEach(subcategory => {
            modalContent += `<li>
              <input type="text" value="${subcategory.name}" data-id="${subcategory._id}">
              <button class="btn btn-sm btn-danger delete-subcategory" data-id="${subcategory._id}">Delete</button>
            </li>`;
          });
          modalContent += "</ul>";
        }
        modalContent += "<input type='text' id='newSubcategory' placeholder='Add new subcategory'>";
        modalContent += "<button id='addSubcategory' class='btn btn-sm btn-success'>Add</button>";


        modalBody.innerHTML = modalContent;

        // Add event listeners for delete buttons
        const deleteSubcategoryButtons = document.querySelectorAll('.delete-subcategory');
        deleteSubcategoryButtons.forEach(deleteButton => {
          deleteButton.addEventListener('click', () => {
            const subcategoryId = deleteButton.dataset.id;
            // Implement your delete logic here (e.g., using fetch API)
            console.log("Deleting subcategory:", subcategoryId);
          });
        });

        // Event listener for adding a subcategory
        const addSubcategoryButton = document.getElementById('addSubcategory');
        addSubcategoryButton.addEventListener('click', () => {
          const newSubcategoryName = document.getElementById('newSubcategory').value;
           // Implement your add logic here (e.g., using fetch API)
          console.log("Adding subcategory:", newSubcategoryName, "to category:", categoryId);
        });
      })
      .catch(error => {
        console.error("Error fetching subcategories:", error);
        modalBody.innerHTML = "<p>Error loading subcategories.</p>";
      });
  });
});

saveChangesButton.addEventListener('click', () => {
  // Implement your save changes logic here (e.g., using fetch API)
  console.log("Saving changes...");
  const subcategoryInputs = document.querySelectorAll('#modalBody input[type="text"]');
  subcategoryInputs.forEach(input => {
    const subcategoryId = input.dataset.id;
    const newSubcategoryName = input.value;
    console.log("Subcategory:", subcategoryId, "New name:", newSubcategoryName);
  });
});



  const categoriesContainer = document.getElementById("categories-container");
  const modal = document.getElementById("myModal");
  const modalContentInner = document.getElementById("modal-content-inner");
  const closeButton = document.querySelector(".close");


  categoriesContainer.addEventListener("click", (event) => {
    if (event.target.classList.contains("edit-button2")) {
      const categoryId = event.target.dataset.categoryId;
      const category = subcategories.find(cat => cat.id === parseInt(categoryId));

      if (category) {
        modalContentInner.innerHTML = `<h2>Edit ${category.name}</h2>
                                       <input type="text" value="${category.name}">
                                       <button>Save</button>`;

        modal.style.display = "block";
      }
    }
  });

  closeButton.addEventListener("click", () => {
    modal.style.display = "none";
  });

  window.addEventListener("click", (event) => {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  });
