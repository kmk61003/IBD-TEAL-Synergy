// My Account page logic
$(document).ready(function () {
    Auth.updateNav();

    // Redirect if not logged in
    if (!Auth.getToken()) {
        window.location.href = '/login.html';
        return;
    }

    var customer = Auth.getCustomer();
    if (customer) {
        $('#account-avatar').text((customer.first_name || 'U').charAt(0).toUpperCase());
        $('#account-user-name').text(customer.first_name + (customer.last_name ? ' ' + customer.last_name : ''));
        $('#account-user-email').text(customer.email || '');
    }

    // Load profile on init
    loadProfile();

    // Live validation
    Validate.bindLiveValidation('#profile-form');
    Validate.bindLiveValidation('#password-form');

    // --- Section navigation ---
    $(document).on('click', '.account-nav-item', function (e) {
        e.preventDefault();
        var section = $(this).data('section');

        if (section === 'logout') {
            Auth.logout();
            return;
        }

        $('.account-nav-item').removeClass('active');
        $(this).addClass('active');
        $('.account-section').hide();
        $('#section-' + section).show();

        if (section === 'orders') loadOrders();
        if (section === 'saved') loadSaved();
    });

    // --- Profile form ---
    $('#profile-form').submit(function (e) {
        e.preventDefault();
        var msg = $('#profile-msg');
        msg.hide();

        if (!Validate.validateForm('#profile-form')) return;

        API.put('/api/account/profile', {
            first_name: $('#pf-fname').val(),
            last_name: $('#pf-lname').val(),
            phone_no: $('#pf-phone').val(),
            address: $('#pf-address').val()
        }).then(function () {
            msg.text('Profile updated successfully.').removeClass('error-message').addClass('success-message').show();
            // Update stored customer data
            var c = Auth.getCustomer() || {};
            c.first_name = $('#pf-fname').val();
            c.last_name = $('#pf-lname').val();
            localStorage.setItem('customer_data', JSON.stringify(c));
            $('#account-user-name').text(c.first_name + (c.last_name ? ' ' + c.last_name : ''));
            $('#account-avatar').text(c.first_name.charAt(0).toUpperCase());
            Auth.updateNav();
        }).catch(function (err) {
            msg.text(err.responseJSON ? err.responseJSON.error : 'Failed to update profile.').removeClass('success-message').addClass('error-message').show();
        });
    });

    // --- Password form ---
    $('#password-form').submit(function (e) {
        e.preventDefault();
        var msg = $('#password-msg');
        msg.hide();

        var newPw = $('#pw-new').val();
        var confirmPw = $('#pw-confirm').val();

        if (!Validate.validateForm('#password-form')) return;

        if (newPw !== confirmPw) {
            msg.text('Passwords do not match.').removeClass('success-message').addClass('error-message').show();
            return;
        }

        API.put('/api/account/password', {
            current_password: $('#pw-current').val(),
            new_password: newPw
        }).then(function () {
            msg.text('Password changed successfully.').removeClass('error-message').addClass('success-message').show();
            $('#pw-current, #pw-new, #pw-confirm').val('');
        }).catch(function (err) {
            msg.text(err.responseJSON ? err.responseJSON.error : 'Failed to change password.').removeClass('success-message').addClass('error-message').show();
        });
    });

    // --- Order detail modal ---
    $('#close-order-detail').click(function () { $('#order-detail-modal').hide(); });
    $(document).on('click', '#order-detail-modal', function (e) {
        if (e.target === this) $(this).hide();
    });
});

function loadProfile() {
    API.get('/api/account/profile').then(function (data) {
        $('#pf-fname').val(data.first_name || '');
        $('#pf-lname').val(data.last_name || '');
        $('#pf-email').val(data.email || '');
        $('#pf-phone').val(data.phone_no || '');
        $('#pf-address').val(data.address || '');
    }).catch(function () {
        // token may be expired
        Auth.logout();
    });
}

function loadOrders() {
    $('#orders-loading').show();
    $('#orders-empty').hide();
    $('#orders-list').empty();

    API.get('/api/account/orders').then(function (orders) {
        $('#orders-loading').hide();

        if (!orders || orders.length === 0) {
            $('#orders-empty').show();
            return;
        }

        var html = '<table class="data-table"><thead><tr>' +
            '<th>Order #</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th>Payment</th><th></th>' +
            '</tr></thead><tbody>';

        for (var i = 0; i < orders.length; i++) {
            var o = orders[i];
            html += '<tr>' +
                '<td>' + esc(o.order_number) + '</td>' +
                '<td>' + new Date(o.created_at).toLocaleDateString() + '</td>' +
                '<td>' + o.item_count + '</td>' +
                '<td>&#8377;' + Number(o.order_total).toLocaleString() + '</td>' +
                '<td><span class="badge badge-' + o.order_status + '">' + o.order_status + '</span></td>' +
                '<td><span class="badge badge-' + o.payment_status + '">' + o.payment_status + '</span></td>' +
                '<td><button class="btn btn-sm view-order-btn" data-id="' + o.id + '">View</button></td>' +
                '</tr>';
        }

        html += '</tbody></table>';
        $('#orders-list').html(html);

        // View order detail handler
        $(document).off('click', '.view-order-btn').on('click', '.view-order-btn', function () {
            var orderId = $(this).data('id');
            loadOrderDetail(orderId);
        });
    }).catch(function () {
        $('#orders-loading').hide();
        $('#orders-list').html('<p class="error-message">Failed to load orders.</p>');
    });
}

function loadOrderDetail(orderId) {
    API.get('/api/account/orders/' + orderId).then(function (data) {
        var o = data.order;
        var items = data.items;

        $('#order-detail-title').text('Order ' + o.order_number);

        var html = '<div class="order-info-grid">' +
            '<div><h4>Order Info</h4>' +
            '<p>Date: ' + new Date(o.created_at).toLocaleDateString() + '</p>' +
            '<p>Status: <span class="badge badge-' + o.order_status + '">' + o.order_status + '</span></p>' +
            '<p>Payment: <span class="badge badge-' + o.payment_status + '">' + o.payment_status + '</span></p></div>' +
            '<div><h4>Billing</h4>' +
            '<p>' + esc(o.bill_fname) + ' ' + esc(o.bill_lname) + '</p>' +
            '<p>' + esc(o.bill_address1) + '</p>' +
            '<p>' + esc(o.bill_pincode) + ', ' + esc(o.bill_country_code) + '</p>' +
            '<p>' + esc(o.bill_phone) + '</p></div>' +
            '<div><h4>Shipping</h4>' +
            '<p>' + esc(o.ship_fname) + ' ' + esc(o.ship_lname) + '</p>' +
            '<p>' + esc(o.ship_address1) + '</p>' +
            '<p>' + esc(o.ship_pincode) + ', ' + esc(o.ship_country_code) + '</p>' +
            '<p>' + esc(o.ship_phone) + '</p></div></div>';

        html += '<table class="data-table"><thead><tr>' +
            '<th>Product</th><th>SKU</th><th>Metal</th><th>Size</th><th>Qty</th><th>Price</th><th>Total</th>' +
            '</tr></thead><tbody>';

        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            html += '<tr>' +
                '<td>' + esc(it.product_name) + '</td>' +
                '<td>' + esc(it.sku) + '</td>' +
                '<td>' + esc(it.metal || '—') + '</td>' +
                '<td>' + esc(it.size || '—') + '</td>' +
                '<td>' + it.quantity + '</td>' +
                '<td>&#8377;' + Number(it.unit_price).toLocaleString() + '</td>' +
                '<td>&#8377;' + Number(it.total_price).toLocaleString() + '</td>' +
                '</tr>';
        }

        html += '</tbody></table>';

        html += '<div class="order-summary-box">' +
            '<p>Subtotal: &#8377;' + Number(o.subtotal).toLocaleString() + '</p>' +
            '<p>Taxes: &#8377;' + Number(o.taxes).toLocaleString() + '</p>' +
            '<p class="order-total-line">Total: &#8377;' + Number(o.order_total).toLocaleString() + '</p></div>';

        $('#order-detail-body').html(html);
        $('#order-detail-modal').show();
    }).catch(function () {
        alert('Failed to load order details.');
    });
}

function loadSaved() {
    $('#saved-loading').show();
    $('#saved-empty').hide();
    $('#saved-grid').empty();

    API.get('/api/account/saved').then(function (items) {
        $('#saved-loading').hide();

        if (!items || items.length === 0) {
            $('#saved-empty').show();
            return;
        }

        for (var i = 0; i < items.length; i++) {
            var p = items[i];
            var img = p.primary_image || '/images/default-product.svg';
            var price = p.min_price ? '&#8377;' + Number(p.min_price).toLocaleString() : 'Price on request';
            var statusBadge = p.status !== 'active' ? '<span class="badge badge-inactive">Unavailable</span>' : '';

            $('#saved-grid').append(
                '<div class="product-card saved-card" data-product-id="' + p.master_product_id + '">' +
                '<div class="product-image"><img src="' + esc(img) + '" alt="' + esc(p.name) + '" /></div>' +
                '<div class="product-info">' +
                '<h3 class="product-name">' + esc(p.name) + '</h3>' +
                '<p class="product-desc">' + esc(p.short_description || '') + '</p>' +
                '<p class="product-price">' + price + ' ' + statusBadge + '</p>' +
                '<div class="saved-card-actions">' +
                '<a href="/pdp.html?id=' + p.master_product_id + '" class="btn btn-sm btn-primary">View</a>' +
                '<button class="btn btn-sm btn-danger remove-saved-btn" data-id="' + p.master_product_id + '">Remove</button>' +
                '</div></div></div>'
            );
        }

        // Remove saved item handler
        $(document).off('click', '.remove-saved-btn').on('click', '.remove-saved-btn', function (e) {
            e.stopPropagation();
            var productId = $(this).data('id');
            API.delete('/api/account/saved/' + productId).then(function () {
                loadSaved();
            });
        });
    }).catch(function () {
        $('#saved-loading').hide();
        $('#saved-grid').html('<p class="error-message">Failed to load saved items.</p>');
    });
}

function esc(str) {
    if (!str) return '';
    return $('<div>').text(String(str)).html();
}
