document.addEventListener('DOMContentLoaded', () => {

    setTimeout(function () {
        window.location.href = '/user/orders?retryPendingOrder=true';
    }, 7000);

})