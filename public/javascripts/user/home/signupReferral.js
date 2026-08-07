document.addEventListener("DOMContentLoaded", () => {
  // Elements

  const referralModal = document.getElementById("referralModal");
  const rewardModal = document.getElementById("rewardModal");

  const closeReferralBtn = document.getElementById("closeReferralModal");
  const skipReferralBtn = document.getElementById("skipReferral");

  const startShoppingBtn = document.getElementById("startShoppingBtn");

  const welcomeTrigger = document.getElementById("welcomeTrigger");

  // Settings From Backend

  const signupBonusSetting = Number(
    document.getElementById("signupBonusSetting")?.value || 1000,
  );

  const refereeRewardSetting = Number(
    document.getElementById("refereeRewardSetting")?.value || 500,
  );

  const coinValueSetting = Number(
    document.getElementById("coinValueSetting")?.value || 0.01,
  );

  // Populate Referral Welcome Modal

  const welcomeReward = document.getElementById("welcomeReferralReward");

  const welcomeText = document.getElementById("welcomeReferralText");

  const claimButtonText = document.getElementById("claimReferralButtonText");

  if (welcomeReward) {
    welcomeReward.textContent = refereeRewardSetting;
  }

  if (welcomeText) {
    welcomeText.textContent = `${refereeRewardSetting} Referral Coins.`;
  }

  if (claimButtonText) {
    claimButtonText.textContent = `Claim My ${refereeRewardSetting} Coins`;
  }

  // Open Referral Modal

  if (
    welcomeTrigger &&
    (welcomeTrigger.value === "true" || welcomeTrigger.value === "1") &&
    referralModal
  ) {
    referralModal.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  // Close Referral Modal

  function closeReferralModal() {
    if (!referralModal) return;

    referralModal.classList.remove("show");

    document.body.style.overflow = "";
  }

  // Open Reward Modal

  function openRewardModal() {
    rewardModal.classList.add("show");

    document.body.style.overflow = "hidden";
  }

  // Close Reward Modal

  function closeRewardModal() {
    rewardModal.classList.remove("show");

    document.body.style.overflow = "";
  }

  // Reward Button

  startShoppingBtn?.addEventListener("click", () => {
    closeRewardModal();
  });

  // Populate Reward Modal

  function populateRewardModal(data) {
    document.getElementById("signupBonusAmount").innerText =
      `+${data.signupBonus} Coins`;

    const referralReward = document.getElementById("referralRewardCard");

    if (data.referralApplied) {
      referralReward.style.display = "flex";

      document.getElementById("referralBonusAmount").innerText =
        `+${data.referralBonus} Coins`;
    } else {
      referralReward.style.display = "none";
    }

    document.getElementById("rewardCoins").innerText =
      `+${data.rewardCoins} Coins`;

    document.getElementById("rewardValue").innerText =
      `Worth ₹${data.rewardValue}`;
  }

  // Cancel Referral

  async function cancelReferral() {
    closeReferralModal();

    try {
      const response = await fetch("/user/referral/cancel", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (response.ok) {
        populateRewardModal({
          signupBonus: result.signupBonus,

          referralBonus: 0,

          rewardCoins: result.rewardCoins,

          rewardValue: result.rewardValue,

          referralApplied: false,
        });

        openRewardModal();
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Close Events

  closeReferralBtn?.addEventListener("click", cancelReferral);

  skipReferralBtn?.addEventListener("click", cancelReferral);

  // Referral Form

  const referralForm = document.querySelector(".welcome-referral-form");

  if (!referralForm) return;

  referralForm.setAttribute("novalidate", "");

  const referralInput = referralForm.querySelector(
    'input[name="referralCode"]',
  );

  const errorContainer = referralForm.querySelector(".input-error-msg");

  // Input Formatting

  referralInput?.addEventListener("input", function () {
    this.value = this.value.toUpperCase();

    errorContainer.textContent = "";

    errorContainer.style.opacity = "0";

    errorContainer.style.display = "none";
  });

  // Submit Referral

  referralForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const referralCode = referralInput.value.trim();

    // Error Helper

    const showError = (message) => {
      errorContainer.textContent = message;

      errorContainer.style.display = "block";

      errorContainer.style.opacity = "1";

      referralInput.focus();
    };

    errorContainer.textContent = "";

    errorContainer.style.display = "none";

    errorContainer.style.opacity = "0";

    // Validation

    if (!referralCode) {
      showError("Please enter a referral code.");

      return;
    }

    const regex = /^[A-Z0-9]{6}$/;

    if (!regex.test(referralCode)) {
      showError("Referral code must contain exactly 6 letters or numbers.");

      return;
    }

    // Loading Button

    const submitBtn = referralForm.querySelector("button[type='submit']");

    submitBtn.disabled = true;

    submitBtn.innerHTML = `
      <i class="fa-solid fa-spinner fa-spin"></i>
      Applying...
    `;

    // Send Request

    try {
      const response = await fetch("/user/referral", {
        method: "POST",

        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },

        body: new URLSearchParams({
          referralCode,
        }),
      });

      const result = await response.json();

      // Success

      if (response.ok) {
        showPopupMessage(
          result.message || "Referral code applied successfully!",

          "success",
        );

        referralForm.reset();

        closeReferralModal();

        populateRewardModal({
          signupBonus: result.signupBonus,

          referralBonus: result.referralBonus,

          rewardCoins: result.rewardCoins,

          rewardValue: result.rewardValue,

          referralApplied: result.referralApplied,
        });

        openRewardModal();
      }

      // Failed
      else {
        showError(result.message || "Invalid referral code.");
      }
    } catch (err) {
      // Network Error

      console.error(err);

      showPopupMessage(
        "Network error occurred.",

        "error",
      );
    } finally {
      // Restore Button

      submitBtn.disabled = false;

      submitBtn.innerHTML = `
        <i class="fa-solid fa-gift"></i>
        <span id="claimReferralButtonText">
          Claim My ${refereeRewardSetting} Coins
        </span>
      `;
    }
  });
});
