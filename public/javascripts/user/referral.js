document.addEventListener("DOMContentLoaded", () => {
  // Copy Referral Code
  const copyBtn = document.getElementById("copyBtn");

  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const code = document.getElementById("referralCode").innerText;
      navigator.clipboard.writeText(code);
      showPopupMessage("Referral code copied!", "success");
    });
  }

  // Redeem Coins
  const redeemForm = document.querySelector(".redeem-form");
  if (!redeemForm) return;
  redeemForm.setAttribute("novalidate", "");
  const redeemCoinInput = redeemForm.querySelector(
    'input[name="reedeemCoinInput"]',
  );
  const errorContainer = redeemForm.querySelector(".input-error-msg");

  // Input Formatting
  redeemCoinInput?.addEventListener("input", function () {
    this.value = this.value.replace(/[^0-9]/g, "");
    errorContainer.textContent = "";
    errorContainer.style.opacity = "0";
    errorContainer.style.display = "none";
  });

  // Submit Redeem Coins
  redeemForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const maxBalance =
      parseInt(redeemForm.getAttribute("data-balance"), 10) || 0;
    const enteredValue = redeemCoinInput.value.trim();
    const redeemCoins = parseInt(enteredValue, 10);

    // Error Helper
    const showError = (message) => {
      errorContainer.textContent = message;
      errorContainer.style.display = "block";
      errorContainer.style.opacity = "1";
      redeemCoinInput.focus();
    };

    errorContainer.textContent = "";
    errorContainer.style.display = "none";
    errorContainer.style.opacity = "0";

    // Validation
    if (!enteredValue || isNaN(redeemCoins)) {
      showError("Please enter the number of coins to redeem.");
      return;
    }
    if (redeemCoins <= 0) {
      showError("Please enter a valid amount greater than 0.");
      return;
    }
    if (redeemCoins % 1000 !== 0) {
      showError("Amount must be a multiple of 1000.");
      return;
    }
    if (redeemCoins > maxBalance) {
      showError(
        `Insufficient balance! Your current balance is ${maxBalance.toLocaleString()} coins.`,
      );
      return;
    }

    // Submit Button
    const submitBtn = redeemForm.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Redeeming...
        `;

    // API Request
    try {
      const response = await fetch("/user/referral/reedeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(new FormData(redeemForm)),
      });

      const result = await response.json();

      // Success
      if (response.ok) {
        showPopupMessage(
          result.message || "Coins redeemed successfully!",
          "success",
        );

        // Update Coin Balance
        if (result.newBalance !== undefined) {
          redeemForm.setAttribute("data-balance", result.newBalance);
          const balanceElement = document.getElementById("coinBalance");
          if (balanceElement) {
            balanceElement.textContent = result.newBalance.toLocaleString();
          }
        }

        // Remove Empty History
        const emptyHistory = document.querySelector(".empty-history");
        if (emptyHistory) {
          emptyHistory.remove();
        }

        // Add New History
        if (result.history) {
          const historyContainer = document.querySelector(".coin-history");
          if (historyContainer) {
            const historyCard = document.createElement("div");
            historyCard.className = "coin-item";
            historyCard.innerHTML = `

                            <div class="coin-left">
                                <div class="coin-icon debit">
                                    <i class="fa-solid fa-arrow-up"></i>
                                </div>

                                <div>
                                    <h4>${result.history.description}</h4>
                                    <small>${new Date(result.history.createdAt).toLocaleDateString()}</small>
                                </div>
                            </div>

                            <div class="coin-right">
                                <span class="coin-debit">
                                    ${result.history.coins}
                                </span>
                                <small>Coins</small>
                            </div>

                        `;

            historyContainer.prepend(historyCard);
          }
        }
        redeemForm.reset();
      }

      // Failure
      else {
        showError(result.message || "Unable to redeem coins.");
      }
    } catch {
      showPopupMessage("Network error occurred.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Redeem Coins";
    }
  });
});
