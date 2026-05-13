
document.addEventListener("DOMContentLoaded", () => {

  // ================================
  // Helpers
  // ================================

  const addProductForm = document.getElementById("add-product-form");

  const imageInput = document.getElementById("image");
  const imageErrorDiv = document.getElementById("image-error");

  const sizesContainer = document.getElementById("details-container");
  const sizeErrorDiv = document.getElementById("size-error");

  const maxImages = 5;
  const maxImageSize = 10 * 1024 * 1024;

  const allowedImageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
  ];

  let selectedFiles = [];

  const previewContainer = document.createElement("div");
  previewContainer.className = "d-flex flex-wrap gap-2 mt-3";
  imageInput.insertAdjacentElement("afterend", previewContainer);

  const setError = (element, message) => {
    if (!element) return;

    element.textContent = message;
    element.style.display = message ? "block" : "none";
  };

  const clearError = (element) => {
    if (!element) return;

    element.textContent = "";
    element.style.display = "none";
  };

  const syncFileInput = () => {
    const dataTransfer = new DataTransfer();

    selectedFiles.forEach((fileObj) => {
      dataTransfer.items.add(fileObj.file);
    });

    imageInput.files = dataTransfer.files;
  };

  const validateProductName = () => {
    const productName = addProductForm.querySelector('[name="name"]');

    const value = productName.value.trim();

    if (!value) {
      displayFieldError(productName, "Product name is required.");
      return false;
    }

    if (value.length < 3 || value.length > 100) {
      displayFieldError(productName, "Product name must be between 3 and 100 characters.");
      return false;
    }

    const validNameRegex = /^[a-zA-Z0-9\s\-&()]+$/;

    if (!validNameRegex.test(value)) {
      displayFieldError(productName, "Invalid product name.");
      return false;
    }

    clearFieldError(productName);

    return true;
  };

  const validateCategory = () => {
    const category = addProductForm.querySelector('[name="categoryId"]');

    if (!category.value.trim()) {
      displayFieldError(category, "Category is required.");
      return false;
    }

    clearFieldError(category);

    return true;
  };

  const validateGender = () => {
    const gender = addProductForm.querySelector('[name="gender"]');

    if (!gender.value) {
      displayFieldError(gender, "Gender selection is required.");
      return false;
    }

    clearFieldError(gender);

    return true;
  };

  const validateDescription = () => {
    const description = document.getElementById("description");

    const value = description.value.trim();

    if (!value) {
      displayFieldError(description, "Description is required.");
      return false;
    }

    if (value.length < 20) {
      displayFieldError(description, "Description should contain at least 20 characters.");
      return false;
    }

    if (value.length > 1000) {
      displayFieldError(description, "Description is too long.");
      return false;
    }

    clearFieldError(description);

    return true;
  };

  const displayFieldError = (input, message) => {
    clearFieldError(input);

    const error = document.createElement("p");

    error.className = "error-message text-danger mt-1";
    error.textContent = message;

    input.insertAdjacentElement("afterend", error);
  };

  const clearFieldError = (input) => {
    const next = input.nextElementSibling;

    if (next && next.classList.contains("error-message")) {
      next.remove();
    }
  };

  const validateImages = () => {

    clearError(imageErrorDiv);

    if (!selectedFiles.length) {
      setError(imageErrorDiv, "At least one image is required.");
      return false;
    }

    if (selectedFiles.length > maxImages) {
      setError(imageErrorDiv, `Maximum ${maxImages} images allowed.`);
      return false;
    }

    return true;
  };

  const validateSizeDetails = () => {

    clearError(sizeErrorDiv);

    const sizeGroups = sizesContainer.querySelectorAll(".size-group");

    if (!sizeGroups.length) {
      setError(sizeErrorDiv, "At least one size is required.");
      return false;
    }

    let valid = true;

    const selectedSizes = [];

    sizeGroups.forEach((row) => {

      const sizeSelect = row.querySelector('[name="sizeName[]"]');
      const qtyInput = row.querySelector('[name="sizeQuantity[]"]');
      const priceInput = row.querySelector('[name="sizePrice[]"]');

      clearFieldError(sizeSelect);
      clearFieldError(qtyInput);
      clearFieldError(priceInput);

      const size = sizeSelect.value.trim();

      if (!size) {
        displayFieldError(sizeSelect, "Select a size.");
        valid = false;
      }

      if (selectedSizes.includes(size)) {
        displayFieldError(sizeSelect, "Duplicate size.");
        valid = false;
      } else {
        selectedSizes.push(size);
      }

      const quantity = qtyInput.value.trim();

      if (!/^\d+$/.test(quantity) || Number(quantity) < 1) {
        displayFieldError(qtyInput, "Quantity must be at least 1.");
        valid = false;
      }

      const price = priceInput.value.trim();

      if (!/^\d+$/.test(price) || Number(price) < 200) {
        displayFieldError(priceInput, "Price must be at least ₹200.");
        valid = false;
      }
    });

    return valid;
  };

  // ================================
  // Image Upload + Preview Logic
  // ================================

  const createPreview = (fileObject) => {

    const imgWrapper = document.createElement("div");

    imgWrapper.className = "position-relative border rounded p-1";
    imgWrapper.style.cssText = `
      width: 120px;
      height: 120px;
      overflow: hidden;
    `;

    imgWrapper.dataset.id = fileObject.id;

    const img = document.createElement("img");

    img.src = URL.createObjectURL(fileObject.file);

    img.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
    `;

    const removeButton = document.createElement("button");

    removeButton.type = "button";
    removeButton.innerHTML = "&times;";

    removeButton.className =
      "btn btn-danger position-absolute";

    removeButton.style.cssText = `
      top: 5px;
      right: 5px;
      font-size: 12px;
      padding: 2px 6px;
      z-index: 5;
    `;

    removeButton.addEventListener("click", () => {

      selectedFiles = selectedFiles.filter(
        (item) => item.id !== fileObject.id
      );

      syncFileInput();

      img.remove();

      previewContainer.removeChild(imgWrapper);

      validateImages();
    });

    const cropButton = document.createElement("button");

    cropButton.type = "button";

    cropButton.innerHTML = "✂️";

    cropButton.className =
      "btn btn-warning btn-sm position-absolute";

    cropButton.style.cssText = `
      top: 5px;
      left: 5px;
      z-index: 5;
    `;

    cropButton.addEventListener("click", () => {
      openCropModal(fileObject, img);
    });

    imgWrapper.appendChild(img);
    imgWrapper.appendChild(removeButton);
    imgWrapper.appendChild(cropButton);

    previewContainer.appendChild(imgWrapper);
  };

  imageInput.addEventListener("change", (event) => {

    clearError(imageErrorDiv);

    const files = Array.from(event.target.files);

    if (!files.length) return;

    if (selectedFiles.length + files.length > maxImages) {

      setError(
        imageErrorDiv,
        `You can upload maximum ${maxImages} images.`
      );

      imageInput.value = "";

      return;
    }

    files.forEach((file) => {

      if (!allowedImageTypes.includes(file.type)) {

        setError(
          imageErrorDiv,
          `${file.name} is not a supported image format.`
        );

        return;
      }

      if (file.size > maxImageSize) {

        setError(
          imageErrorDiv,
          `${file.name} exceeds 10MB limit.`
        );

        return;
      }

      const duplicateFile = selectedFiles.find((item) => {
        return (
          item.file.name === file.name &&
          item.file.size === file.size
        );
      });

      if (duplicateFile) {

        setError(
          imageErrorDiv,
          `${file.name} is already selected.`
        );

        return;
      }

      const fileObject = {
        id: crypto.randomUUID(),
        file
      };

      selectedFiles.push(fileObject);

      createPreview(fileObject);
    });

    setTimeout(() => {

      syncFileInput();

      validateImages();

    }, 0);

    imageInput.value = "";
  });

  // ================================
  // Crop Modal Logic
  // ================================

  let currentCropper = null;

  const openCropModal = (fileObject, previewImage) => {

    if (currentCropper) {
      currentCropper.destroy();
      currentCropper = null;
    }

    let existingModal = document.getElementById("cropModal");

    if (existingModal) {
      existingModal.remove();
    }

    const modalWrapper = document.createElement("div");

    modalWrapper.innerHTML = `
      <div class="modal fade" id="cropModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content">

            <div class="modal-header">
              <h5 class="modal-title">Crop Image</h5>

              <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal"
              ></button>
            </div>

            <div class="modal-body text-center">

              <img
                id="cropper-image"
                style="
                  max-width: 100%;
                  max-height: 500px;
                "
              />

            </div>

            <div class="modal-footer">

              <button
                type="button"
                class="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                Cancel
              </button>

              <button
                type="button"
                class="btn btn-primary"
                id="crop-btn"
              >
                Crop
              </button>

            </div>

          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalWrapper);

    const modalElement = document.getElementById("cropModal");

    const cropModal = new bootstrap.Modal(modalElement);

    cropModal.show();

    const cropperImage = document.getElementById("cropper-image");

    cropperImage.src = URL.createObjectURL(fileObject.file);

    cropperImage.onload = () => {

      currentCropper = new Cropper(cropperImage, {
        aspectRatio: 1,
        viewMode: 1,
        autoCropArea: 1,
        responsive: true,
      });
    };

    modalElement.addEventListener("hidden.bs.modal", () => {

      if (currentCropper) {
        currentCropper.destroy();
        currentCropper = null;
      }

      modalElement.remove();
    });

    document
      .getElementById("crop-btn")
      .addEventListener(
        "click",
        async () => {

          if (!currentCropper) return;

          const croppedCanvas =
            currentCropper.getCroppedCanvas({
              width: 1000,
              height: 1000,
            });

          croppedCanvas.toBlob((blob) => {

            const croppedFile = new File(
              [blob],
              fileObject.file.name,
              {
                type: "image/png",
                lastModified: Date.now(),
              }
            );

            fileObject.file = croppedFile;

            previewImage.src =
              URL.createObjectURL(croppedFile);

            syncFileInput();

            cropModal.hide();

          }, "image/png");

        },
        { once: true }
      );
  };

  // ================================
  // Dynamic Size Logic
  // ================================

  const addSizeButton = document.getElementById("add-size");

  const getSelectedSizes = () => {
    return Array.from(
      sizesContainer.querySelectorAll('[name="sizeName[]"]')
    ).map((select) => select.value);
  };

  addSizeButton.addEventListener("click", () => {

    clearError(sizeErrorDiv);

    const allSizes = [
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL",
      "XXXL",
      "one size"
    ];

    const selectedSizes = getSelectedSizes();

    const availableSizes = allSizes.filter(
      (size) => !selectedSizes.includes(size)
    );

    if (!availableSizes.length) {

      setError(
        sizeErrorDiv,
        "All sizes are already selected."
      );

      return;
    }

    const sizeGroup = document.createElement("div");

    sizeGroup.className = "row mb-2 size-group";

    sizeGroup.innerHTML = `
      <div class="col-md-3">

        <select
          name="sizeName[]"
          class="form-control"
        >
          ${availableSizes
        .map((size) => {
          return `
                <option value="${size}">
                  ${size}
                </option>
              `;
        })
        .join("")}
        </select>

      </div>

      <div class="col-md-3">

        <input
          type="number"
          name="sizeQuantity[]"
          class="form-control"
          placeholder="Quantity"
          min="1"
        />

      </div>

      <div class="col-md-3">

        <input
          type="number"
          name="sizePrice[]"
          class="form-control"
          placeholder="Price"
          min="200"
        />

      </div>

      <div class="col-md-3">

        <button
          type="button"
          class="btn btn-danger remove-size"
        >
          Remove
        </button>

      </div>
    `;

    sizesContainer.appendChild(sizeGroup);
  });

  sizesContainer.addEventListener("click", (event) => {

    if (!event.target.classList.contains("remove-size")) {
      return;
    }

    const sizeGroups =
      sizesContainer.querySelectorAll(".size-group");

    if (sizeGroups.length <= 1) {

      setError(
        sizeErrorDiv,
        "At least one size is required."
      );

      return;
    }

    clearError(sizeErrorDiv);

    event.target
      .closest(".size-group")
      .remove();

    validateSizeDetails();
  });

  // ================================
  // Realtime Validation
  // ================================

  const productNameInput =
    addProductForm.querySelector('[name="name"]');

  const categoryInput =
    addProductForm.querySelector('[name="categoryId"]');

  const genderInput =
    addProductForm.querySelector('[name="gender"]');

  const descriptionInput =
    document.getElementById("description");

  productNameInput.addEventListener(
    "input",
    validateProductName
  );

  categoryInput.addEventListener(
    "change",
    validateCategory
  );

  genderInput.addEventListener(
    "change",
    validateGender
  );

  descriptionInput.addEventListener(
    "input",
    validateDescription
  );

  sizesContainer.addEventListener("input", (event) => {

    const target = event.target;

    if (
      target.name === "sizeQuantity[]" ||
      target.name === "sizePrice[]"
    ) {
      validateSizeDetails();
    }
  });

  sizesContainer.addEventListener("change", (event) => {

    const target = event.target;

    if (target.name === "sizeName[]") {
      validateSizeDetails();
    }
  });

  // ================================
  // Final Submit Validation
  // ================================

  addProductForm.addEventListener(
    "submit",
    (event) => {

      const isProductNameValid =
        validateProductName();

      const isCategoryValid =
        validateCategory();

      const isGenderValid =
        validateGender();

      const isDescriptionValid =
        validateDescription();

      const isImagesValid =
        validateImages();

      const isSizeDetailsValid =
        validateSizeDetails();

      const isFormValid =
        isProductNameValid &&
        isCategoryValid &&
        isGenderValid &&
        isDescriptionValid &&
        isImagesValid &&
        isSizeDetailsValid;

      if (!isFormValid) {

        event.preventDefault();

        const firstError = document.querySelector(
          ".error-message.text-danger"
        );

        if (firstError) {
          firstError.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
    }
  );

});

