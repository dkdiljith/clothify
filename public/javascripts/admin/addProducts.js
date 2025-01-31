$(document).ready(function () {
  let currentStep = 1;
  const totalSteps = 3;
  const sizeQuantityContainer = $("#size-quantity-inputs");

  // ✅ Next Button: Validate Before Moving Forward
  $("#next-step").click(function () {
      if (!validateCurrentStep()) return; // Stop if validation fails
      toggleStep(currentStep, ++currentStep);
  });

  // ⏪ Previous Step Button
  $("#prev-step").click(function () {
      toggleStep(currentStep, --currentStep);
  });

  function toggleStep(prev, next) {
      $(`#step-${prev}`).hide();
      $(`#step-${next}`).show();
      $("#prev-step").toggle(next > 1);
      $("#next-step").toggle(next < totalSteps);
      $("#submit-btn").toggle(next === totalSteps);
  }

  // ✅ Validate Current Step Before Proceeding
  function validateCurrentStep() {
      const currentStepForm = $(`#step-${currentStep} :input[required]`);
      let isValid = true;

      currentStepForm.each(function () {
          if (!this.checkValidity()) {
              isValid = false;
              $(this).addClass("is-invalid");
          } else {
              $(this).removeClass("is-invalid");
          }
      });

      return isValid;
  }

  // ✅ Remove Red Border on Input Change
  $(document).on("input", "input, select", function () {
      if (this.checkValidity()) {
          $(this).removeClass("is-invalid");
      }
  });

  // ✅ Size & Quantity Management
  let counter = 1; // Initialize a counter for dynamic fields

  $('.add-size-btn').click(function() {
      let newRow = `
          <div class="row mb-2">
              <div class="col-md-4">
                  <input type="text" class="form-control size-input" name="size[${counter}][size]" placeholder="Size (e.g., S, M, L)" required>
              </div>
              <div class="col-md-4">
                  <input type="number" class="form-control quantity-input" name="size[${counter}][quantity]" placeholder="Quantity" min="1" required>
              </div>
              <div class="col-md-4">
                  <button type="button" class="btn btn-danger remove-size-btn">Remove</button>
              </div>
          </div>
      `;
      $('#size-quantity-inputs').append(newRow);
      counter++; // Increment the counter for the next row
  });

  sizeQuantityContainer.on("click", ".remove-size-btn", function () {
      $(this).closest(".row").remove();
  });
  const MAX_IMAGES = 5;
  const imageUpload = document.getElementById("image-upload");
  const imagePreview = document.getElementById("image-preview");
  const imageError = document.createElement("div");
  imageError.classList.add("text-danger", "mt-2");
  imageUpload.insertAdjacentElement("afterend", imageError);
  
  function validateImages() {
      const files = imageUpload.files;
      imageError.textContent = ""; // Clear previous errors
      imagePreview.innerHTML = ""; // Clear preview
  
      if (files.length > MAX_IMAGES) {
          imageError.textContent = `You can only upload up to ${MAX_IMAGES} images.`;
          imageUpload.value = ""; // Reset input
          return;
      }
  
      for (let file of files) {
          const fileType = file.type;
          if (!fileType.match(/image\/(png|jpeg|gif|jpg|webp)/)) { // Added more image types
              imageError.textContent = "Only PNG, JPEG, GIF, JPG and WEBP images are allowed."; // Updated message
              imageUpload.value = ""; // Reset input
              return;
          }
  
          const img = document.createElement("img");
          img.src = URL.createObjectURL(file);
          img.style.width = "100px";
          img.classList.add("m-2");
          imagePreview.appendChild(img);
      }
  }
  
  imageUpload.addEventListener("change", validateImages);

  
  function resetForm() {
      $("#addProductForm")[0].reset();
      $(".is-invalid").removeClass("is-invalid");
      $(".select2").val(null).trigger("change");
  }
});
