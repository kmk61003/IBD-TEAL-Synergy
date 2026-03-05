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
                `<a href="/my-account.html" class="nav-account-link">My Account</a>
                 <span class="nav-welcome">Hi, ${$('<span>').text(customer.first_name).html()}</span>
                 <a href="#" id="logout-link">Logout</a>`
            );
            $(document).off('click', '#logout-link').on('click', '#logout-link', function (e) {
                e.preventDefault();
                Auth.logout();
            });
        } else {
            authDiv.html('<a href="/login.html">Login</a>');
        }
    }
};

// ── Inline Form Validation Helper ──────────────────────────────
const Validate = {
    emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phoneRegex: /^[0-9+\-\s]{7,15}$/,
    nameRegex: /^[A-Za-z ]+$/,
    pincodeRegex: /^[A-Za-z0-9 \-]{3,10}$/,
    countryRegex: /^[A-Za-z]{2,3}$/,

    showError: function(input, msg) {
        var $input = $(input);
        $input.addClass('input-error');
        $input.siblings('.field-error').text(msg).show();
    },

    clearError: function(input) {
        var $input = $(input);
        $input.removeClass('input-error');
        $input.siblings('.field-error').text('').hide();
    },

    validateField: function(input) {
        var $el = $(input);
        var val = $el.val().trim();
        var type = $el.attr('type') || 'text';
        var required = $el.prop('required');
        var minLen = parseInt($el.attr('minlength')) || 0;
        var maxLen = parseInt($el.attr('maxlength')) || 9999;
        var pattern = $el.attr('pattern');

        // Skip disabled fields
        if ($el.prop('disabled')) { this.clearError(input); return true; }

        // Required check
        if (required && !val) {
            this.showError(input, 'This field is required.');
            return false;
        }

        // Skip further checks if empty and not required
        if (!val) { this.clearError(input); return true; }

        // Min length
        if (val.length < minLen) {
            this.showError(input, 'Must be at least ' + minLen + ' characters.');
            return false;
        }

        // Max length
        if (val.length > maxLen) {
            this.showError(input, 'Cannot exceed ' + maxLen + ' characters.');
            return false;
        }

        // Email
        if (type === 'email' && !this.emailRegex.test(val)) {
            this.showError(input, 'Enter a valid email address.');
            return false;
        }

        // Tel
        if (type === 'tel' && val && !this.phoneRegex.test(val)) {
            this.showError(input, 'Enter a valid phone number.');
            return false;
        }

        // Custom pattern
        if (pattern) {
            var re = new RegExp('^' + pattern + '$');
            if (!re.test(val)) {
                this.showError(input, $el.attr('title') || 'Invalid format.');
                return false;
            }
        }

        this.clearError(input);
        return true;
    },

    validateForm: function(formSelector) {
        var self = this;
        var valid = true;
        $(formSelector).find('input:not(:disabled), textarea:not(:disabled), select:not(:disabled)').each(function() {
            if (!self.validateField(this)) valid = false;
        });
        return valid;
    },

    bindLiveValidation: function(formSelector) {
        var self = this;
        $(formSelector).on('blur', 'input, textarea, select', function() {
            self.validateField(this);
        });
        $(formSelector).on('input change', 'input.input-error, textarea.input-error, select.input-error', function() {
            self.validateField(this);
        });
    },

    luhn: function(num) {
        var digits = num.replace(/\D/g, '');
        if (digits.length < 13 || digits.length > 16) return false;
        var sum = 0;
        var alt = false;
        for (var i = digits.length - 1; i >= 0; i--) {
            var n = parseInt(digits[i], 10);
            if (alt) {
                n *= 2;
                if (n > 9) n -= 9;
            }
            sum += n;
            alt = !alt;
        }
        return sum % 10 === 0;
    },

    isExpiryValid: function(mmyy) {
        var parts = mmyy.split('/');
        if (parts.length !== 2) return false;
        var month = parseInt(parts[0], 10);
        var year = parseInt('20' + parts[1], 10);
        if (month < 1 || month > 12) return false;
        var now = new Date();
        var curMonth = now.getMonth() + 1;
        var curYear = now.getFullYear();
        if (year < curYear) return false;
        if (year === curYear && month < curMonth) return false;
        return true;
    }
};
