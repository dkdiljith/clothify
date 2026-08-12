const ClothifyCounterManager = {
  // Selectors bound directly to your existing HTML elements
  selectors: {
    wishlist: ".wishlist-badge",
    cart: ".cart-badge",
  },

  _render: function (type, targetValue) {
    const selectorStr = this.selectors[type];
    if (!selectorStr) return;

    document.querySelectorAll(selectorStr).forEach((badge) => {
      if (targetValue > 0) {
        badge.textContent = targetValue;
        badge.style.display = "flex";
      } else {
        badge.style.display = "none";
      }

      badge.style.transform = "translate(25%, -25%) scale(1.25)";
      badge.style.transition = "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)";

      setTimeout(() => {
        badge.style.transform = "translate(25%, -25%) scale(1)";
      }, 150);
    });
  },


  update: function (type, action, value = 0) {
    const targetSelector = this.selectors[type];
    const referenceBadge = document.querySelector(targetSelector);

    // Safely extract the active visual number directly out of the layout layer
    let currentCount = 0;
    if (referenceBadge && referenceBadge.style.display !== "none") {
      currentCount = parseInt(referenceBadge.textContent.trim(), 10) || 0;
    }

    let finalCount = currentCount;

    if (action === "increment") finalCount = currentCount + 1;
    else if (action === "decrement") finalCount = Math.max(0, currentCount - 1);
    else if (action === "set") finalCount = Math.max(0, value);

    // Dispatches values to all matching visual badges on the current page views
    this._render(type, finalCount);
  },
};



// usage
//  ClothifyCounterManager.update('wishlist', 'increment');
//  ClothifyCounterManager.update('cart', 'set', data.cartCount);



if (typeof window !== "undefined") {
  window.ClothifyCounterManager = ClothifyCounterManager;
}
