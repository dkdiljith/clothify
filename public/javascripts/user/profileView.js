document.addEventListener('DOMContentLoaded', () => {
    // Profile picture upload functionality
    const uploadBtn = document.querySelector('.profile-picture-upload');
    
    // Safety check to prevent errors if the button isn't on the page
    if (uploadBtn) {
        uploadBtn.addEventListener('click', function () {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    const formData = new FormData();
                    formData.append('profileImage', file);

                    try {
                        const response = await fetch('/user/upload-profile-image', {
                            method: 'POST',
                            body: formData
                        });

                        const data = await response.json();

                        if (data.success) {
                            document.querySelector('.profile-picture').src = data.imageUrl;
                            showPopupMessage('Profile picture updated successfully', 'success');
                        } else {
                            showPopupMessage(data.message || 'Failed to upload image', 'error');
                        }
                    } catch (error) {
                        console.error('Error uploading image:', error);
                        showPopupMessage('An error occurred. Please try again.', 'error');
                    }
                }
            };

            input.click();
        });
    }
});
