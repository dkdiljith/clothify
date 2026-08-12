document.addEventListener("DOMContentLoaded", () => {
  // Form
  const form = document.getElementById("referralSettingsForm");
  if (!form) return;
  form.setAttribute("novalidate", "");

  // Inputs
  const coinValue = document.getElementById("coinValue");
  const signupBonus = document.getElementById("signupBonus");
  const referrerReward = document.getElementById("referrerReward");
  const refereeReward = document.getElementById("refereeReward");
  const holdingPeriod = document.getElementById("referralHoldingPeriodDays");
  const saveBtn = document.getElementById("saveReferralSettings");

  // Preview
  const previewCoinValue = document.getElementById("previewCoinValue");
  const previewSignup = document.getElementById("previewSignup");
  const previewReferrer = document.getElementById("previewReferrer");
  const previewReferee = document.getElementById("previewReferee");
  const previewHolding = document.getElementById("previewHolding");

  // Helpers
  function getErrorContainer(input) {
    return input.closest(".form-group").querySelector(".input-error-msg");
  }

  function showError(input, message) {
    const error = getErrorContainer(input);
    if (!error) return;
    error.textContent = message;
    error.style.display = "block";
    input.classList.add("error");
  }

  function clearError(input) {
    const error = getErrorContainer(input);
    if (!error) return;
    error.textContent = "";
    error.style.display = "none";
    input.classList.remove("error");
  }

  // Live Preview
  function updatePreview() {
    const value = parseFloat(coinValue.value || 0);
    previewCoinValue.textContent = `₹${(value * 100).toFixed(2)}`;
    previewSignup.textContent = `${signupBonus.value || 0} Coins`;
    previewReferrer.textContent = `${referrerReward.value || 0} Coins`;
    previewReferee.textContent = `${refereeReward.value || 0} Coins`;
    previewHolding.textContent = `${holdingPeriod.value || 0} Days`;
  }

  updatePreview();

  // Coin Value Restriction
  coinValue.addEventListener("input", function () {
    let value = this.value;
    value = value.replace(/[^0-9.]/g, "");

    // Only one decimal point
    const firstDot = value.indexOf(".");
    if (firstDot !== -1) {
      value =
        value.substring(0, firstDot + 1) +
        value
          .substring(firstDot + 1)

          .replace(/\./g, "");
    }

    // Max five decimals
    if (value.includes(".")) {
      const split = value.split(".");

      split[1] = split[1].slice(0, 5);

      value = split.join(".");
    }

    // Max integer = 1
    if (
      value.startsWith("2") ||
      value.startsWith("3") ||
      value.startsWith("4") ||
      value.startsWith("5") ||
      value.startsWith("6") ||
      value.startsWith("7") ||
      value.startsWith("8") ||
      value.startsWith("9")
    ) {
      value = "1";
    }
    if (value.startsWith("1.") && value !== "1") {
      value = "1";
    }
    this.value = value;

    clearError(this);
    updatePreview();
  });

  // Reward Restriction
  function rewardRestriction(input) {
    input.addEventListener("input", function () {
      let value = this.value;
      value = value.replace(/\D/g, "");
      value = value.slice(0, 5);
      if (Number(value) > 10000) {
        value = "10000";
      }
      this.value = value;
      clearError(this);
      updatePreview();
    });
  }

  rewardRestriction(signupBonus);
  rewardRestriction(referrerReward);
  rewardRestriction(refereeReward);

  // Holding Days Restriction
  holdingPeriod.addEventListener("input", function () {
    let value = this.value;
    value = value.replace(/\D/g, "");
    value = value.slice(0, 2);
    this.value = value;
    validateHoldingPeriod();
    updatePreview();
  });

  // Disable Mouse Wheel
  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
      },
      { passive: false },
    );
  });

  // Coin Value Validation
  function validateCoinValue() {
    const value = coinValue.value.trim();
    if (!value) {
      showError(coinValue, "Coin value is required.");
      return false;
    }

    if (!/^(0(\.\d{1,5})?|1)$/.test(value)) {
      showError(
        coinValue,
        "Clothify allows only values like 0.1, 0.01, 0.001, 0.0001, 0.00001 or 1.",
      );
      return false;
    }

    const number = Number(value);

    if (isNaN(number)) {
      showError(coinValue, "Only numeric values are allowed.");
      return false;
    }

    if (number <= 0) {
      showError(coinValue, "Coin value must be greater than 0.");
      return false;
    }

    if (number > 1) {
      showError(coinValue, "Coin value cannot exceed 1.");
      return false;
    }

    clearError(coinValue);
    return true;
  }

  // Reward Validation
  function validateReward(input, fieldName) {
    const value = input.value.trim();

    if (!value) {
      showError(input, `${fieldName} is required.`);
      return false;
    }

    if (!/^\d+$/.test(value)) {
      showError(input, "Only numeric values are allowed.");
      return false;
    }

    const number = Number(value);

    if (number < 1) {
      showError(input, `${fieldName} cannot be negative.`);
      return false;
    }

    if (number > 10000) {
      showError(
        input,
        `Clothify restricts ${fieldName.toLowerCase()} to a maximum of 10,000 coins.`,
      );
      return false;
    }

    clearError(input);
    return true;
  }

  // Holding Period Validation
  function validateHoldingPeriod() {
    const value = holdingPeriod.value.trim();
    if (value === "") {
      showError(holdingPeriod, "Holding period is required.");
      return false;
    }

    if (!/^\d+$/.test(value)) {
      showError(holdingPeriod, "Only numbers are allowed.");
      return false;
    }

    const number = Number(value);
    if (number < 1) {
      showError(holdingPeriod, "Holding period must be at least 1 day.");
      return false;
    }

    if (number > 30) {
      showError(
        holdingPeriod,
        "Clothify allows a maximum holding period of 30 days.",
      );
      return false;
    }

    clearError(holdingPeriod);
    return true;
  }

  // Validate Entire Form
  function validateForm() {
    let valid = true;
    valid = validateCoinValue() && valid;
    valid = validateReward(signupBonus, "Signup Bonus") && valid;
    valid = validateReward(referrerReward, "Referrer Reward") && valid;
    valid = validateReward(refereeReward, "Referee Reward") && valid;
    valid = validateHoldingPeriod() && valid;
    return valid;
  }

  // Real-Time Validation
  coinValue.addEventListener("input", () => {
    validateCoinValue();
  });

  signupBonus.addEventListener("input", () => {
    validateReward(signupBonus, "Signup Bonus");
  });

  referrerReward.addEventListener("input", () => {
    validateReward(referrerReward, "Referrer Reward");
  });

  refereeReward.addEventListener("input", () => {
    validateReward(refereeReward, "Referee Reward");
  });

  holdingPeriod.addEventListener("input", () => {
    validateHoldingPeriod();
  });

  // Blur Validation
  coinValue.addEventListener("blur", validateCoinValue);

  signupBonus.addEventListener("blur", () =>
    validateReward(signupBonus, "Signup Bonus"),
  );

  referrerReward.addEventListener("blur", () =>
    validateReward(referrerReward, "Referrer Reward"),
  );

  refereeReward.addEventListener("blur", () =>
    validateReward(refereeReward, "Referee Reward"),
  );

  holdingPeriod.addEventListener("blur", validateHoldingPeriod);

  // Initial Validation
  validateCoinValue();

  validateReward(signupBonus, "Signup Bonus");

  validateReward(referrerReward, "Referrer Reward");

  validateReward(refereeReward, "Referee Reward");
  validateHoldingPeriod();

  // Submit Form
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Final Validation
    if (!validateForm()) {
      showPopupMessage(
        "Please fix the highlighted fields before saving.",
        "error",
      );
      return;
    }

    // Loading State
    saveBtn.disabled = true;
    saveBtn.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Saving...
        `;

    // Prepare Request
    const body = new URLSearchParams({
      coinValue: coinValue.value.trim(),
      signupBonus: signupBonus.value.trim(),
      referrerReward: referrerReward.value.trim(),
      refereeReward: refereeReward.value.trim(),
      referralHoldingPeriodDays: holdingPeriod.value.trim(),
    });

    // Send Request
    try {
      const response = await fetch(
        "/admin/settings/referral",

        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
        },
      );

      let result = {};
      result = await response.json();

      // Success
      if (response.ok) {
        showPopupMessage(
          result.message || "Referral settings updated successfully.",
          "success",
        );
        // Refresh Preview
        updatePreview();
      }

      // Validation Error From Backend
      else if (response.status === 400) {
        if (result.field && result.message) {
          switch (result.field) {
            case "coinValue":
              showError(coinValue, result.message);
              break;

            case "signupBonus":
              showError(signupBonus, result.message);
              break;

            case "referrerReward":
              showError(referrerReward, result.message);
              break;

            case "refereeReward":
              showError(refereeReward, result.message);
              break;

            case "referralHoldingPeriodDays":
              showError(holdingPeriod, result.message);
              break;
          }
        }

        showPopupMessage(
          result.message || "Unable to save referral settings.",
          "error",
        );
      }

      // Other Errors
      else {
        showPopupMessage(
          result.message || "Something went wrong while saving settings.",

          "error",
        );
      }
    } catch {
      // Network Error
      showPopupMessage("Network error occurred. Please try again.", "error");
    } finally {
      // Restore Button
      saveBtn.disabled = false;
      saveBtn.innerHTML = `
                <i class="fa-solid fa-floppy-disk"></i>
                Save Changes

            `;
    }
  });
});
