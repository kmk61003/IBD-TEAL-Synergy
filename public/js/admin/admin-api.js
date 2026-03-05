// Admin shared helper
const AdminAPI = {
    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('admin_token');
        if (token) headers['Authorization'] = 'Bearer ' + token;
        return headers;
    },

    checkAuth() {
        if (!localStorage.getItem('admin_token')) {
            window.location.href = '/admin/login.html';
            return false;
        }
        return true;
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

    upload(url, formData, method) {
        const headers = {};
        const token = localStorage.getItem('admin_token');
        if (token) headers['Authorization'] = 'Bearer ' + token;
        return $.ajax({ url, method: method || 'POST', headers, data: formData, processData: false, contentType: false });
    },

    logout() {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_data');
        window.location.href = '/admin/login.html';
    },

    initNav() {
        const admin = JSON.parse(localStorage.getItem('admin_data') || '{}');
        $('#admin-name').text(admin.username || 'Admin');
    }
};
