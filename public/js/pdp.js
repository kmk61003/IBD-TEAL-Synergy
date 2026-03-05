// PDP (Product Detail Page) logic
$(document).ready(function () {
    Auth.updateNav();

    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        window.location.href = '/';
        return;
    }

    let allVariants = [];
    let selectedVariant = null;

    API.get('/api/products/' + encodeURIComponent(productId))
        .then(product => {
            $('#pdp-loading').hide();
            $('#pdp-content').show();

            // Set product info
            document.title = product.name + ' - IBD Teal Jewelry';
            $('#product-name').text(product.name);
            $('#product-description').html($('<div>').text(product.description || product.short_description || '').html());

            // Breadcrumb
            let breadHtml = '<a href="/">Home</a>';
            if (product.categories && product.categories.length > 0) {
                const cat = product.categories[0];
                breadHtml += ` / <a href="/?category=${encodeURIComponent(cat.slug)}">${$('<span>').text(cat.name).html()}</a>`;
            }
            breadHtml += ` / <span>${$('<span>').text(product.name).html()}</span>`;
            $('#breadcrumb').html(breadHtml);

            // Images
            if (product.images && product.images.length > 0) {
                const primaryImg = product.images.find(i => i.is_primary) || product.images[0];
                $('#main-img').attr('src', primaryImg.image_path).attr('alt', product.name);

                const thumbList = $('#thumbnail-list');
                product.images.forEach((img, idx) => {
                    thumbList.append(
                        `<img src="${img.image_path}" alt="${$('<span>').text(product.name).html()}"
                              class="thumbnail ${idx === 0 ? 'active' : ''}"
                              data-src="${img.image_path}" />`
                    );
                });

                $(document).on('click', '.thumbnail', function () {
                    $('.thumbnail').removeClass('active');
                    $(this).addClass('active');
                    $('#main-img').attr('src', $(this).data('src'));
                });
            } else {
                $('#main-img').attr('src', '/css/placeholder.svg');
            }

            // Variants
            allVariants = product.variants || [];
            if (allVariants.length === 0) {
                $('#variant-section').html('<p>No variants available.</p>');
                $('#add-to-cart-btn').prop('disabled', true);
                return;
            }

            // Populate metal options
            const metals = [...new Set(allVariants.map(v => v.metal).filter(Boolean))];
            const metalSelect = $('#metal-select');
            metalSelect.empty();
            metals.forEach(m => metalSelect.append(`<option value="${m}">${m}</option>`));

            // Update sizes when metal changes
            function updateSizes() {
                const selectedMetal = metalSelect.val();
                const sizes = allVariants
                    .filter(v => v.metal === selectedMetal)
                    .map(v => v.size)
                    .filter(Boolean);
                const uniqueSizes = [...new Set(sizes)];

                const sizeSelect = $('#size-select');
                sizeSelect.empty();
                if (uniqueSizes.length === 0) {
                    sizeSelect.append('<option value="">N/A</option>');
                } else {
                    uniqueSizes.forEach(s => sizeSelect.append(`<option value="${s}">${s}</option>`));
                }
                updateVariant();
            }

            function updateVariant() {
                const metal = metalSelect.val();
                const size = $('#size-select').val();

                selectedVariant = allVariants.find(v =>
                    v.metal === metal && (v.size === size || (!v.size && !size))
                ) || allVariants.find(v => v.metal === metal);

                if (selectedVariant) {
                    const effectivePrice = selectedVariant.discount_price || selectedVariant.price;
                    $('#product-price').text('₹' + Number(effectivePrice).toLocaleString());

                    if (selectedVariant.discount_price && selectedVariant.discount_price < selectedVariant.price) {
                        $('#product-original-price').text('₹' + Number(selectedVariant.price).toLocaleString()).show();
                    } else {
                        $('#product-original-price').hide();
                    }

                    $('#variant-sku').text(selectedVariant.sku);
                    $('#variant-weight').text(selectedVariant.weight ? selectedVariant.weight + 'g' : '—');
                    $('#variant-stock').text(selectedVariant.inventory > 0 ? 'In Stock (' + selectedVariant.inventory + ')' : 'Out of Stock')
                        .toggleClass('in-stock', selectedVariant.inventory > 0)
                        .toggleClass('out-of-stock', selectedVariant.inventory <= 0);

                    $('#add-to-cart-btn').prop('disabled', selectedVariant.inventory <= 0);
                    $('#qty-input').attr('max', selectedVariant.inventory).val(1);
                }
            }

            metalSelect.on('change', updateSizes);
            $('#size-select').on('change', updateVariant);
            updateSizes();

            // Quantity controls
            $('#qty-minus').click(function () {
                const input = $('#qty-input');
                const val = parseInt(input.val()) || 1;
                if (val > 1) input.val(val - 1);
            });
            $('#qty-plus').click(function () {
                const input = $('#qty-input');
                const val = parseInt(input.val()) || 1;
                const max = parseInt(input.attr('max')) || 99;
                if (val < max) input.val(val + 1);
            });

            // Add to cart
            $('#add-to-cart-btn').click(function () {
                if (!selectedVariant) return;
                const qty = parseInt($('#qty-input').val()) || 1;

                $(this).prop('disabled', true).text('Adding...');

                API.post('/api/cart', {
                    lot_product_id: selectedVariant.id,
                    quantity: qty
                }).then(() => {
                    $('#cart-message').text('Added to cart!').removeClass('error').addClass('success').show();
                    updateCartCount();
                    setTimeout(() => $('#cart-message').fadeOut(), 3000);
                }).catch(err => {
                    $('#cart-message').text(err.responseJSON?.error || 'Failed to add.').removeClass('success').addClass('error').show();
                }).always(() => {
                    $('#add-to-cart-btn').prop('disabled', false).text('Add to Cart');
                });
            });
        })
        .catch(() => {
            $('#pdp-loading').text('Product not found.');
        });
});
