// Wait for the HTML DOM to fully load before running element selectors
document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. Profile Picture Upload Event Listeners
    // ==========================================
    const uploadTrigger = document.getElementById('uploadTrigger');
    const profileImageUpload = document.getElementById('profileImageUpload');

    if (uploadTrigger && profileImageUpload) {
        uploadTrigger.addEventListener('click', function () {
            profileImageUpload.click();
        });

        profileImageUpload.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file size (2MB max)
                if (file.size > 2 * 1024 * 1024) {
                    showPopupMessage('File size should be less than 2MB', 'error');
                    return;
                }

                // Validate file type
                const validTypes = ['image/jpeg', 'image/png'];
                if (!validTypes.includes(file.type)) {
                    showPopupMessage('Only JPG and PNG files are allowed', 'error');
                    return;
                }

                // Preview the image
                const reader = new FileReader();
                reader.onload = function (event) {
                    const previewEl = document.getElementById('profilePicturePreview');
                    if (previewEl) {
                        previewEl.src = event.target.result;
                    }
                    // Upload the image to server
                    uploadProfileImage(file);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // ==========================================
    // 2. Form Validation Event Listener
    // ==========================================
    const profileForm = document.getElementById('profileEditForm');
    
    if (profileForm) {
        profileForm.addEventListener('submit', function (event) {
            let isValid = true;

            // Reset error messages
            document.querySelectorAll('.error-message').forEach(el => {
                el.style.display = 'none';
            });

            // Validate full name
            const fullNameEl = document.getElementById('full-name');
            if (fullNameEl) {
                const fullName = fullNameEl.value.trim();
                if (!fullName) {
                    const nameError = document.getElementById('nameError');
                    if (nameError) {
                        nameError.textContent = 'Full name is required';
                        nameError.style.display = 'block';
                    }
                    isValid = false;
                }
            }

            // Validate phone number
            const phoneEl = document.getElementById('mobile-number');
            if (phoneEl) {
                const phone = phoneEl.value.trim();
                if (phone && !/^\d{10}$/.test(phone)) {
                    const phoneError = document.getElementById('phoneError');
                    if (phoneError) {
                        phoneError.textContent = 'Please enter a valid 10-digit phone number';
                        phoneError.style.display = 'block';
                    }
                    isValid = false;
                }
            }

            if (!isValid) {
                event.preventDefault();
            }
        });
    }

    // ==========================================
    // 3. Inject Dynamic Notification Styling
    // ==========================================
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 5px;
            color: white;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            transition: opacity 0.3s ease;
        }
        .notification.success {
            background-color: #28a745;
        }
        .notification.error {
            background-color: #dc3545;
        }
        .notification i {
            font-size: 18px;
        }
    `;
    document.head.appendChild(style);
});

// ==========================================
// 4. Standalone Network Request Functions
// ==========================================
async function uploadProfileImage(file) {
    const formData = new FormData();
    formData.append('profileImage', file);

    try {
        const response = await fetch('/user/upload-profile-image', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showPopupMessage('Profile picture updated successfully', 'success');
        } else {
            showPopupMessage(data.message || 'Failed to upload image', 'error');
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        showPopupMessage('An error occurred. Please try again.', 'error');
    }
}
