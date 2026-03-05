// Cart page logic
$(document).ready(function () {
    Auth.updateNav();
    loadCart();

    function loadCart() {
        API.get('/api/cart').then(data => {
            $('#cart-loading').hide();

            if (!data.items || data.items.length === 0) {
                $('#cart-empty').show();
                $('#cart-content').hide();
                return;
            }

            $('#cart-empty').hide();
            $('#cart-content').show();

            const tbody = $('#cart-items');
            tbody.empty();

            data.items.forEach(item => {
                const img = item.image_path || '/images/default-product.svg';
                const price = item.effective_price;

                tbody.append(`
                    <tr data-id="${item.id}">
                        <td class="cart-product">
                            <img src="${img}" alt="${$('<span>').text(item.product_name).html()}" class="cart-thumb" />
                            <div>
                                <strong>${$('<span>').text(item.product_name).html()}</strong>
                                <small>SKU: ${$('<span>').text(item.sku).html()}</small>
                            </div>
                        </td>
                        <td>${$('<span>').text(item.metal || '—').html()}</td>
                        <td>${$('<span>').text(item.size || '—').html()}</td>
                        <td>₹${Number(price).toLocaleString()}</td>
                        <td>
                            <div class="quantity-control">
                                <button class="btn btn-sm qty-dec" data-id="${item.id}">−</button>
                                <input type="number" class="qty-input" value="${item.quantity}" min="1" max="${item.inventory}" data-id="${item.id}" />
                                <button class="btn btn-sm qty-inc" data-id="${item.id}">+</button>
                            </div>
                        </td>
                        <td>₹${Number(item.line_total).toLocaleString()}</td>
                        <td><button class="btn btn-sm btn-danger remove-btn" data-id="${item.id}">✕</button></td>
                    </tr>
                `);
            });

            $('#cart-total-amount').text('₹' + Number(data.cart_total).toLocaleString());
        }).catch(() => {
            $('#cart-loading').text('Failed to load cart.');
        });
    }

    // Quantity decrease
    $(document).on('click', '.qty-dec', function () {
        const id = $(this).data('id');
        const input = $(`.qty-input[data-id="${id}"]`);
        const val = parseInt(input.val()) || 1;
        if (val > 1) updateCartItem(id, val - 1);
    });

    // Quantity increase
    $(document).on('click', '.qty-inc', function () {
        const id = $(this).data('id');
        const input = $(`.qty-input[data-id="${id}"]`);
        const val = parseInt(input.val()) || 1;
        const max = parseInt(input.attr('max')) || 99;
        if (val < max) updateCartItem(id, val + 1);
    });

    // Quantity direct change
    $(document).on('change', '.qty-input', function () {
        const id = $(this).data('id');
        const val = parseInt($(this).val()) || 1;
        updateCartItem(id, val);
    });

    // Remove item
    $(document).on('click', '.remove-btn', function () {
        const id = $(this).data('id');
        API.delete('/api/cart/' + id).then(() => {
            loadCart();
            updateCartCount();
        }).catch(err => {
            alert(err.responseJSON?.error || 'Failed to remove item.');
        });
    });

    function updateCartItem(id, quantity) {
        API.put('/api/cart/' + id, { quantity }).then(() => {
            loadCart();
            updateCartCount();
        }).catch(err => {
            alert(err.responseJSON?.error || 'Failed to update quantity.');
        });
    }
});
