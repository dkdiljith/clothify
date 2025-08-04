document.addEventListener("DOMContentLoaded", () => {
  // ================================
  // Helpers for Error Messaging
  // ================================
  const displayError = (element, message) => {
    clearError(element);
    const error = document.createElement("p");
    error.className = "error-message text-danger";
    error.textContent = message;
    element.insertAdjacentElement("afterend", error);
  };

  const clearError = (element) => {
    const next = element.nextElementSibling;
    if (next && next.classList.contains("error-message")) {
      next.remove();
    }
  };

  const clearErrors = (container) => {
    container.querySelectorAll(".error-message").forEach((el) => el.remove());
  };

  // ================================
  // Form Validation
  // ================================
  const addProductForm = document.getElementById("add-product-form");

  const validateField = (input) => {
    clearError(input);
    const { name, value, files } = input;

    switch (name) {
      case "name":
        if (!value.trim()) displayError(input, "Product name is required.");
        break;
      case "categoryId":
        if (!value.trim()) displayError(input, "Category is required.");
        break;
      case "price":
        if (!value || value < 200 || value > 1000)
          displayError(input, "Price must be between ₹200 and ₹1000.");
        break;
      case "gender":
        if (!value) displayError(input, "Gender selection is required.");
        break;
      case "images":
        if (!files.length)
          displayError(input, "At least one image is required.");
        break;
      default:
        break;
    }
  };

  const validateForm = () => {
    let valid = true;
    clearErrors(addProductForm);

    const productName = addProductForm.querySelector('[name="name"]');
    const category = addProductForm.querySelector('[name="categoryId"]');
    const gender = addProductForm.querySelector('[name="gender"]');
    const imageInput = addProductForm.querySelector('[name="images"]');

    if (!productName.value.trim()) {
      valid = false;
      displayError(productName, "Product name is required.");
    }
    if (!category.value.trim()) {
      valid = false;
      displayError(category, "Category is required.");
    }
    if (!gender.value) {
      valid = false;
      displayError(gender, "Gender selection is required.");
    }
    if (!imageInput.files.length) {
      valid = false;
      displayError(imageInput, "At least one image is required.");
    } else {
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
      const maxSize = 10 * 1024 * 1024; // 10MB
      for (let file of imageInput.files) {
        if (!allowedTypes.includes(file.type)) {
          valid = false;
          displayError(imageInput, "Only JPEG, JPG, and PNG files are allowed.");
          break;
        }
        if (file.size > maxSize) {
          valid = false;
          displayError(imageInput, "Each image must be smaller than 10MB.");
          break;
        }
      }
    }
    return valid;
  };

  // ================================
  // Combined Size Details Validation
  // ================================
  const sizesContainer = document.getElementById("details-container");
  const sizeErrorDiv = document.getElementById("size-error");

  const validateSizeDetails = () => {
    let valid = true;
    clearError(sizeErrorDiv);

    const sizeGroups = sizesContainer.querySelectorAll(".size-group");

    // Ensure at least one size group exists
    if (sizeGroups.length === 0) {
      valid = false;
      displayError(sizeErrorDiv, "At least one size, quantity, and price field is required.");
      return valid;
    }

    let selectedSizes = [];

    sizeGroups.forEach((row) => {
      const sizeSelect = row.querySelector('[name="sizeName[]"]');
      const qtyInput = row.querySelector('[name="sizeQuantity[]"]');
      const priceInput = row.querySelector('[name="sizePrice[]"]');

      clearError(sizeSelect);
      clearError(qtyInput);
      clearError(priceInput);

      // Validate size: must be selected and not duplicate
      if (!sizeSelect.value.trim()) {
        valid = false;
        displayError(sizeErrorDiv, "Size field cannot be empty.");
      }
      if (selectedSizes.includes(sizeSelect.value)) {
        valid = false;
        displayError(sizeErrorDiv, "Duplicate sizes are not allowed.");
      } else {
        selectedSizes.push(sizeSelect.value);
      }

      // Validate quantity: must be provided and at least 1
      const quantity = parseInt(qtyInput.value, 10);
      if (!qtyInput.value || isNaN(quantity) || quantity < 1) {
        valid = false;
        displayError(sizeErrorDiv, "Quantity must be at least 1.");
      }

      // Validate price: must be provided and at least ₹200
      const price = parseInt(priceInput.value, 10);
      if (!priceInput.value || isNaN(price) || price < 200) {
        valid = false;
        displayError(sizeErrorDiv, "Price must be at least ₹200.");
      }
    });

    return valid;
  };

  if (addProductForm) {
    // Submit handler: prevent submission if any validation fails
    addProductForm.addEventListener("submit", (event) => {
      if (!validateForm() || !validateSizeDetails()) {
        event.preventDefault();
      }
    });

    // Real-time validation for basic fields
    const fieldsToValidate = ["name", "categoryId", "price", "gender", "images"];
    addProductForm
      .querySelectorAll(fieldsToValidate.map((field) => `[name="${field}"]`).join(", "))
      .forEach((input) => {
        input.addEventListener("input", () => validateField(input));
      });
  }

  // ================================
  // Image Upload and Preview Logic
  // ================================
  const imageInput = document.getElementById("image");
  const imageErrorDiv = document.getElementById("image-error");
  const previewContainer = document.createElement("div");
  previewContainer.classList.add("d-flex", "flex-wrap", "gap-2");
  imageInput.insertAdjacentElement("afterend", previewContainer);
  let imageCount = 0;
  const cropperInstances = {};
  const maxImages = 5;

  imageInput.addEventListener("change", (event) => {
    const files = event.target.files;
    if (files.length + imageCount > maxImages) {
      imageErrorDiv.textContent = `You can only upload up to ${maxImages} images.`;
      imageErrorDiv.classList.add("text-danger");
      return;
    }

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        imageErrorDiv.textContent = "Only image files are allowed.";
        imageErrorDiv.classList.add("text-danger");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const imgWrapper = document.createElement("div");
        imgWrapper.className = "position-relative border p-1";
        imgWrapper.style.cssText = "width:120px; height:120px;";

        const img = document.createElement("img");
        img.src = e.target.result;
        img.style.cssText = "width:100%; height:100%; object-fit:cover;";

        const closeButton = document.createElement("button");
        closeButton.innerHTML = "&times;";
        closeButton.className = "btn btn-danger position-absolute";
        closeButton.style.cssText = "top:5px; right:5px; font-size:12px; padding:2px 6px;";
        closeButton.addEventListener("click", () => {
          previewContainer.removeChild(imgWrapper);
          imageCount--;
          delete cropperInstances[file.name];
        });

        const cropButton = document.createElement("button");
        cropButton.innerText = "✂️";
        cropButton.className = "btn btn-warning btn-sm position-absolute";
        cropButton.style.cssText = "top:5px; left:5px;";
        cropButton.type = "button";
        cropButton.addEventListener("click", () => openCropModal(file, imgWrapper, img));

        imgWrapper.append(img, closeButton, cropButton);
        previewContainer.appendChild(imgWrapper);
        imageCount++;
      };

      reader.readAsDataURL(file);
    });
  });

  const openCropModal = (file, imgWrapper, imgElement) => {
    let modal = document.getElementById("cropModal");
    if (modal) modal.remove();

    modal = document.createElement("div");
    modal.innerHTML = `
      <div class="modal fade" id="cropModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Crop Image</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body d-flex justify-content-center">
              <img id="cropper-image" style="max-width:100%;">
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="crop-btn">Crop</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const cropModal = new bootstrap.Modal(document.getElementById("cropModal"));
    cropModal.show();

    const cropperImg = document.getElementById("cropper-image");
    cropperImg.src = imgElement.src;
    const cropper = new Cropper(cropperImg, { aspectRatio: 1, viewMode: 2 });
    cropperInstances[file.name] = cropper;

    document.getElementById("crop-btn").addEventListener(
      "click",
      () => {
        const croppedCanvas = cropper.getCroppedCanvas();
        imgElement.src = croppedCanvas.toDataURL();
        cropModal.hide();
      },
      { once: true }
    );
  };

  // ================================
  // Size Options Logic
  // ================================
  const addSizeButton = document.getElementById("add-size");

  addSizeButton.addEventListener("click", () => {
    const allSizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
    const selectedSizes = Array.from(sizesContainer.querySelectorAll('[name="sizeName[]"]')).map((select) => select.value);
    const availableSizes = allSizes.filter((size) => !selectedSizes.includes(size));

    if (!availableSizes.length) {
      displayError(sizeErrorDiv, "All sizes are selected. Cannot add more.");
      return;
    }
    clearError(sizeErrorDiv);

    const newSizeGroup = document.createElement("div");
    newSizeGroup.className = "row mb-2 size-group";
    newSizeGroup.innerHTML = `
      <div class="col-md-3">
        <select name="sizeName[]" class="form-control">
          ${availableSizes.map((size) => `<option value="${size}">${size}</option>`).join("")}
        </select>
      </div>
      <div class="col-md-3">
        <input type="number" name="sizeQuantity[]" class="form-control" placeholder="Quantity" min="1" />
      </div>
      <div class="col-md-3">
        <input type="number" name="sizePrice[]" class="form-control" placeholder="Price" min="200" />
      </div>
      <div class="col-md-3">
        <button type="button" class="btn btn-danger remove-size">Remove</button>
      </div>
    `;
    sizesContainer.appendChild(newSizeGroup);
  });

  sizesContainer.addEventListener("click", (event) => {
    if (event.target.classList.contains("remove-size")) {
      const sizeGroups = sizesContainer.querySelectorAll(".size-group");
      if (sizeGroups.length > 1) {
        event.target.closest(".size-group").remove();
      } else {
        displayError(sizeErrorDiv, "At least one size is required.");
      }
    }
  });
});
