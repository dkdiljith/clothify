document.addEventListener("DOMContentLoaded", function () {
  const addProductForm = document.getElementById("add-product-form");

  if (addProductForm) {
    // Submit validation
    addProductForm.addEventListener("submit", function (event) {
      event.preventDefault(); ///////error happened here previously

      // Clear previous error messages
      clearErrors();

      let valid = validateForm();

      if (valid) addProductForm.submit();
    });

    // Real-time validation for input fields
    addProductForm
      .querySelectorAll(
        '[name="name"], [name="category"], [name="price"], [name="gender"], [name="images"]'
      )
      .forEach((input) => {
        input.addEventListener("input", function () {
          validateField(input);
        });
      });
  }

  // Function to validate entire form
  function validateForm() {
    let valid = true;

    const productName = addProductForm.querySelector('[name="name"]');
    const category = addProductForm.querySelector('[name="category"]');
    const price = addProductForm.querySelector('[name="price"]');
    const gender = addProductForm.querySelector('[name="gender"]');
    const imageInput = addProductForm.querySelector('[name="images"]');

    if (!productName.value.trim()) {
      valid = false;
      displayError(productName, "Product name is required.");
    }

   

    if (!gender.value) {
      valid = false;
      displayError(gender, "Gender selection is required.");
    }

    if (!imageInput.files.length) {
      valid = false;
      displayError(imageInput, "At least one image is required.");
    } else {
      const allowedFileTypes = ["image/jpeg", "image/jpg", "image/png"];
      const maxFileSize = 10 * 1024 * 1024; // 10MB

      for (let file of imageInput.files) {
        if (!allowedFileTypes.includes(file.type)) {
          valid = false;
          displayError(
            imageInput,
            "Only JPEG, JPG, and PNG files are allowed."
          );
          break;
        }
        if (file.size > maxFileSize) {
          valid = false;
          displayError(imageInput, "Each image must be smaller than 10MB.");
          break;
        }
      }
    }

    return valid;
  }

  // Function to validate a single field on input
  function validateField(input) {
    clearError(input);

    if (input.name === "name" && !input.value.trim()) {
      displayError(input, "Product name is required.");
    } else if (input.name === "categor" && !input.value.trim()) {
      displayError(input, "Category is required.");
    } else if (input.name === "price") {
      if (!input.value || input.value < 200 || input.value > 1000) {
        displayError(input, "Price must be between ₹200 and ₹1000.");
      }
    } else if (input.name === "gender" && !input.value) {
      displayError(input, "Gender selection is required.");
    } else if (input.name === "images" && !input.files.length) {
      displayError(input, "At least one image is required.");
    }
  }

  // Function to show error messages
  function displayError(element, message) {
    clearError(element);
    element.insertAdjacentHTML(
      "afterend",
      `<p class="error-message text-danger">${message}</p>`
    );
  }

  // Function to remove previous errors for a field
  function clearError(element) {
    if (
      element.nextElementSibling &&
      element.nextElementSibling.classList.contains("error-message")
    ) {
      element.nextElementSibling.remove();
    }
  }

  // Function to clear all error messages before validation
  function clearErrors() {
    addProductForm
      .querySelectorAll(".error-message")
      .forEach((error) => error.remove());
  }
});

// Image Upload and Preview Logic
const imageInput = document.getElementById("image");
const previewContainer = document.createElement("div");
previewContainer.classList.add("d-flex", "flex-wrap", "gap-2");
imageInput.insertAdjacentElement("afterend", previewContainer);
let imageCount = 0;
let cropperInstances = {};
const maxImages = 5;

imageInput.addEventListener("change", function (event) {
  const files = event.target.files;
  if (files.length + imageCount > maxImages) {
    const warningDiv = document.getElementById("image-error");
    warningDiv.textContent = `You can only upload up to ${maxImages} images.`;
    warningDiv.classList.add("text-danger");
    return;
  }

  Array.from(files).forEach((file) => {
    if (!file.type.startsWith("image/")) {
      const warningDiv = document.getElementById("image-error");
      warningDiv.textContent = "Only image files are allowed.";
      warningDiv.classList.add("text-danger");
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const imgWrapper = document.createElement("div");
      imgWrapper.classList.add("position-relative", "border", "p-1");
      imgWrapper.style.width = "120px";
      imgWrapper.style.height = "120px";

      const img = document.createElement("img");
      img.src = e.target.result;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";

      const closeButton = document.createElement("button");
      closeButton.innerHTML = "&times;";
      closeButton.classList.add("btn", "btn-danger", "position-absolute");
      closeButton.style.top = "5px";
      closeButton.style.right = "5px";
      closeButton.style.fontSize = "12px";
      closeButton.style.padding = "2px 6px";
      closeButton.addEventListener("click", () => {
        previewContainer.removeChild(imgWrapper);
        imageCount--;
        delete cropperInstances[file.name];
      });

      const cropButton = document.createElement("button");
      cropButton.innerText = "✂️";
      cropButton.classList.add(
        "btn",
        "btn-warning",
        "btn-sm",
        "position-absolute"
      );
      cropButton.style.top = "5px";
      cropButton.style.left = "5px";
      cropButton.type = "button";
      cropButton.addEventListener("click", () =>
        openCropModal(file, imgWrapper, img)
      );

      imgWrapper.appendChild(img);
      imgWrapper.appendChild(closeButton);
      imgWrapper.appendChild(cropButton);
      previewContainer.appendChild(imgWrapper);
      imageCount++;
    };
    reader.readAsDataURL(file);
  });
});

function openCropModal(file, imgWrapper, imgElement) {
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
           <button type="button" class="btn btn-primary" id="crop-btn" onclick="cropImage()">Crop</button>
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
    function () {
      const croppedCanvas = cropper.getCroppedCanvas();
      imgElement.src = croppedCanvas.toDataURL();
      cropModal.hide();
    },
    { once: true }
  );
}

/////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
document.addEventListener("DOMContentLoaded", function () {
  const sizesContainer = document.getElementById("details-container");
  const addSizeButton = document.getElementById("add-size");
  const sizeErrorDiv = document.getElementById("size-error");
  const price = document.getElementById("price")

  function validateSizes() {
    let selectedSizes = new Set();
    let allValid = true;
    sizeErrorDiv.textContent = "";

    document.querySelectorAll('[name="sizeName[]"]').forEach((select) => {
      const selectedValue = select.value;
      if (selectedSizes.has(selectedValue)) {
        allValid = false;
        sizeErrorDiv.textContent = "Duplicate sizes are not allowed.";
        sizeErrorDiv.classList.add("text-danger");
      } else {
        selectedSizes.add(selectedValue);
      }
    });

    return allValid;
  }

  function validateQuantities() {
    let allValid = true;
    sizeErrorDiv.textContent = "";

    document.querySelectorAll('[name="sizeQuantity[]"]').forEach((input) => {
      if (!input.value || input.value <= 0) {
        allValid = false;
        sizeErrorDiv.textContent = "Quantity cannot be empty or zero.";
        sizeErrorDiv.classList.add("text-danger");
      }
    });

    return allValid;
  }

  function validatePrice() {
    let allValid = true;
    price.textContent = "";

    document.querySelectorAll('[name="sizePrice[]"]').forEach((input) => {
      if (!input.value || input.value <= 0) {
        allValid = false;
        sizeErrorDiv.textContent = "Quantity cannot be empty or zero.";
        sizeErrorDiv.classList.add("text-danger");
      }
    });

    return allValid;
  }

  // 🔴 Real-time Validation for Size Selection
  sizesContainer.addEventListener("change", function (event) {
    if (event.target.name === "sizeName[]") {
      validateSizes();
    }
  });

  // 🔴 Real-time Validation for Quantity Input
  sizesContainer.addEventListener("input", function (event) {
    if (event.target.name === "sizeQuantity[]") {
      validateQuantities();
    }
  });

  addSizeButton.addEventListener("click", function () {
    const allSizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
    const selectedSizes = Array.from(
      document.querySelectorAll('[name="sizeName[]"]')
    ).map((select) => select.value);
    const availableSizes = allSizes.filter(
      (size) => !selectedSizes.includes(size)
    );

    if (availableSizes.length === 0) {
      sizeErrorDiv.textContent = "All sizes are selected. Cannot add more.";
      sizeErrorDiv.classList.add("text-danger");
      return;
    }

    sizeErrorDiv.textContent = "";
    sizeErrorDiv.classList.remove("text-danger");

    const newSizeGroup = document.createElement("div");
    newSizeGroup.classList.add("row", "mb-2", "size-group");

    newSizeGroup.innerHTML = `
      <div class="col-md-3">
        <select name="sizeName[]" class="form-control">
          ${availableSizes
            .map((size) => `<option value="${size}">${size}</option>`)
            .join("")}
        </select>
      </div>
      <div class="col-md-3">
        <input type="number" name="sizeQuantity[]" class="form-control" placeholder="Quantity" min="1" />
      </div>
      <div class="col-md-3">
                      <input
                        type="number"
                        name="price"
                        id="price"
                        class="form-control"
                        placeholder="Price"
                        min="200"
                      />
                    </div>
      <div class="col-md-3">
        <button type="button" class="btn btn-danger remove-size">Remove</button>
      </div>
    `;

    sizesContainer.appendChild(newSizeGroup);
  });

  sizesContainer.addEventListener("click", function (event) {
    if (event.target.classList.contains("remove-size")) {
      if (document.querySelectorAll(".size-group").length > 1) {
        event.target.closest(".size-group").remove();
      } else {
        sizeErrorDiv.textContent = "At least one size is required.";
        sizeErrorDiv.classList.add("text-danger");
      }
    }
  });

  document
    .getElementById("add-product-form")
    .addEventListener("submit", function (event) {
      let sizeValid = validateSizes();
      let quantityValid = validateQuantities();

      // Prevent submission if there are errors
      if (!sizeValid || !quantityValid) {
        event.preventDefault(); // Stop form submission
      }
    });
});
