document.addEventListener('DOMContentLoaded', () => {


    const addFundsButtons = document.querySelectorAll('.btn-add-funds');
    const closeButtons = document.querySelectorAll('.close-funds-modal');
    const confirmAddFundsBtn = document.getElementById('confirm-add-funds');
    const amountButtons = document.querySelectorAll('.preset-amount-btn');

    amountButtons.forEach(button => {
        button.addEventListener('click', function () {
            const amountValue = Number(this.dataset.amount);

            setAmount(amountValue);
        });
    });


    if (confirmAddFundsBtn) {
        confirmAddFundsBtn.addEventListener('click', () => {
            addFunds();
        });
    }


    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            hideAddFundsModal();
        });
    });

    addFundsButtons.forEach(button => {
        button.addEventListener('click', () => {
            showAddFundsModal();
        });
    });




    // Show add funds modal
    function showAddFundsModal() {
        document.getElementById('addFundsModal').style.display = 'flex';
        document.getElementById('fundsAmount').focus();
    }

    // Hide add funds modal
    function hideAddFundsModal() {
        document.getElementById('addFundsModal').style.display = 'none';
        document.getElementById('fundsAmount').value = '';
    }

    // Set quick amount
    function setAmount(amount) {
        document.getElementById('fundsAmount').value = amount;
    }

    // Add funds to wallet using Razorpay
    async function addFunds() {
        const amountInput = document.getElementById('fundsAmount');
        const amount = parseFloat(amountInput.value);

        if (!amount || amount <= 0) {
            showPopupMessage('Please enter a valid amount', 'error');
            return;
        }

        try {
            // Create Razorpay order
            const response = await fetch('/user/wallet/create-razorpay-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ amount: amount })
            });

            if (!response.ok) {
                throw new Error(order.message || 'Failed to create payment order');
            }

            const order = await response.json();



            // Razorpay options
            const options = {
                key: 'rzp_test_TVFPFUZdUa9wz4', // Your Razorpay key
                amount: order.amount,
                currency: order.currency,
                name: 'Add Wallet Funds',
                description: `Adding ₹${amount} to your wallet`,
                order_id: order.id,
                handler: async function (response) {
                    // Verify payment on server
                    const verifyResponse = await fetch('/user/wallet/verify-payment', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature,
                            amount: amount
                        })
                    });

                    const result = await verifyResponse.json();

                    if (verifyResponse.ok) {
                        showPopupMessage(`Successfully added ₹${amount.toFixed(2)} to your wallet`, 'success');
                        hideAddFundsModal();
                        setTimeout(() => {
                            location.reload(); // Refresh to show updated balance
                        }, 2000);
                    } else {
                        throw new Error(result.message || 'Payment verification failed');
                    }
                },
                "prefill": {
                    "name": "{{user.name}}",
                    "email": "{{user.email}}",
                    "contact": "{{user.phone}}"
                },
                modal: {
                    ondismiss: function () {
                        showPopupMessage(`Payment was cancelled`, 'error');
                    }
                },
                theme: {
                    color: '#3498db'
                }
            };

            const rzp = new Razorpay(options);
            rzp.open();

        } catch (error) {
            console.error('Error:', error);
            showPopupMessage(error.message, 'error');
        }
    }

    // Close modal when clicking outside
    window.onclick = function (event) {
        const modal = document.getElementById('addFundsModal');
        if (event.target === modal) {
            hideAddFundsModal();
        }
    }

})