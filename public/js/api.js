// Shared API helper using jQuery AJAX
const API = {
    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('jwt_token');
        if (token) headers['Authorization'] = 'Bearer ' + token;
        return headers;
    },

    get(url) {
        return $.ajax({ url, method: 'GET', headers: this.getHeaders() });
    },

    post(url, data) {
        return $.ajax({ url, method: 'POST', headers: this.getHeaders(), data: JSON.stringify(data) });
    },

    put(url, data) {
        return $.ajax({ url, method: 'PUT', headers: this.getHeaders(), data: JSON.stringify(data) });
    },

    delete(url) {
        return $.ajax({ url, method: 'DELETE', headers: this.getHeaders() });
    },

    // For multipart form data (file uploads)
    upload(url, formData, method) {
        const headers = {};
        const token = localStorage.getItem('jwt_token');
        if (token) headers['Authorization'] = 'Bearer ' + token;
        return $.ajax({ url, method: method || 'POST', headers, data: formData, processData: false, contentType: false });
    }
};

// Update cart count in nav
function updateCartCount() {
    API.get('/api/cart').then(data => {
        $('#cart-count').text(data.item_count || 0);
    }).catch(() => {
        $('#cart-count').text(0);
    });
}

$(document).ready(function () {
    updateCartCount();
});
