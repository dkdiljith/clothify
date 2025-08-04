///////////////////////////////////////////////////////////////////////////////////////////////////////////
// ✅ Notification function
const showNotification = (type, message) => {
    const container = document.getElementById('notification-container') || createNotificationContainer();
    const notification = document.createElement('div');
    notification.classList.add('notification', type);
    notification.innerHTML = `
                <span>${message}</span>
                <span class="close-btn">&times;</span>
            `;

    container.appendChild(notification);

    // Remove notification after 4 seconds
    setTimeout(() => {
        notification.remove();
    }, 4000);

    // Close button functionality
    notification.querySelector('.close-btn').addEventListener('click', () => {
        notification.remove();
    });
};

const createNotificationContainer = () => {
    const container = document.createElement('div');
    container.id = 'notification-container';
    document.body.appendChild(container);
    return container;
};