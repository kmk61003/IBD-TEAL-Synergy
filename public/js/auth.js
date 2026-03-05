// Auth helper — token management and nav updates
const Auth = {
    getToken() {
        return localStorage.getItem('jwt_token');
    },

    getCustomer() {
        const data = localStorage.getItem('customer_data');
        return data ? JSON.parse(data) : null;
    },

    setToken(token, customer) {
        localStorage.setItem('jwt_token', token);
        if (customer) localStorage.setItem('customer_data', JSON.stringify(customer));
    },

    logout() {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('customer_data');
        window.location.href = '/login.html';
    },

    updateNav() {
        const token = this.getToken();
        const customer = this.getCustomer();
        const authDiv = $('#auth-links');

        if (token && customer) {
            authDiv.html(
                `<span class="nav-welcome">Hi, ${$('<span>').text(customer.first_name).html()}</span>
                 <a href="#" id="logout-link">Logout</a>`
            );
            $(document).on('click', '#logout-link', function (e) {
                e.preventDefault();
                Auth.logout();
            });
        } else {
            authDiv.html('<a href="/login.html">Login</a>');
        }
    }
};
