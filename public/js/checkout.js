// Checkout page logic
$(document).ready(function () {
    Auth.updateNav();

    // Live validation on checkout form
    Validate.bindLiveValidation('#checkout-form');

    // Load cart summary
    API.get('/api/cart').then(data => {
        if (!data.items || data.items.length === 0) {
            window.location.href = '/cart.html';
            return;
        }

        const summaryDiv = $('#summary-items');
        data.items.forEach(item => {
            summaryDiv.append(`
                <div class="summary-item">
                    <span>${$('<span>').text(item.product_name).html()} × ${item.quantity}</span>
                    <span>₹${Number(item.line_total).toLocaleString()}</span>
                </div>
            `);
        });

        const subtotal = data.cart_total;
        const taxes = parseFloat((subtotal * 0.18).toFixed(2));
        const total = parseFloat((subtotal + taxes).toFixed(2));

        $('#summary-subtotal').text('₹' + subtotal.toLocaleString());
        $('#summary-taxes').text('₹' + taxes.toLocaleString());
        $('#summary-total').text('₹' + total.toLocaleString());

        // Pre-fill email if logged in
        const customer = Auth.getCustomer();
        if (customer && customer.email) {
            $('#bill_email').val(customer.email);
        }
    }).catch(() => {
        window.location.href = '/cart.html';
    });

    // Toggle shipping section
    $('#same-as-billing').change(function () {
        if ($(this).is(':checked')) {
            $('#shipping-section').hide();
        } else {
            $('#shipping-section').show();
        }
    });

    // Form submission
    $('#checkout-form').submit(function (e) {
        e.preventDefault();
        $('#checkout-error').hide();

        // Validate billing fields
        if (!Validate.validateForm('#checkout-form')) return;

        // Validate shipping if different from billing
        var sameAsBilling = $('#same-as-billing').is(':checked');
        if (!sameAsBilling) {
            var shipValid = true;
            $('#shipping-section input').each(function() {
                $(this).prop('required', true);
                if (!Validate.validateField(this)) shipValid = false;
            });
            if (!shipValid) return;
        }

        $('#place-order-btn').prop('disabled', true).text('Placing Order...');

        const orderData = {
            bill_fname: $('#bill_fname').val(),
            bill_lname: $('#bill_lname').val(),
            bill_address1: $('#bill_address1').val(),
            bill_country_code: $('#bill_country_code').val(),
            bill_pincode: $('#bill_pincode').val(),
            bill_phone: $('#bill_phone').val(),
            bill_email: $('#bill_email').val(),
            ship_fname: sameAsBilling ? $('#bill_fname').val() : $('#ship_fname').val(),
            ship_lname: sameAsBilling ? $('#bill_lname').val() : $('#ship_lname').val(),
            ship_address1: sameAsBilling ? $('#bill_address1').val() : $('#ship_address1').val(),
            ship_country_code: sameAsBilling ? $('#bill_country_code').val() : $('#ship_country_code').val(),
            ship_pincode: sameAsBilling ? $('#bill_pincode').val() : $('#ship_pincode').val(),
            ship_phone: sameAsBilling ? $('#bill_phone').val() : $('#ship_phone').val(),
            ship_email: sameAsBilling ? $('#bill_email').val() : $('#ship_email').val()
        };

        if (!Auth.getToken()) {
            orderData.guest_email = orderData.bill_email;
        }

        // Place order then redirect to payment page
        API.post('/api/orders', orderData)
            .then(orderResult => {
                window.location.href = '/payment.html?order=' + encodeURIComponent(orderResult.order_number);
            })
            .then(orderResult => {
                window.location.href = '/payment.html?order=' + encodeURIComponent(orderResult.order_number);
            })
            .catch(err => {
                const msg = (err.responseJSON && err.responseJSON.error) || 'Failed to place order. Please try again.';
                $('#checkout-error').text(msg).show();
                $('#place-order-btn').prop('disabled', false).text('Place Order');
            });
    });
});
