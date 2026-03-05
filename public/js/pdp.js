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
                $('#main-img').attr('src', '/images/default-product.svg');
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

            // Save / Wishlist
            if (Auth.getToken()) {
                API.get('/api/account/saved/check/' + encodeURIComponent(productId)).then(function (data) {
                    if (data.saved) {
                        $('#save-item-btn').html('&#9829; Saved').addClass('btn-saved');
                    }
                });
            }

            $('#save-item-btn').click(function () {
                if (!Auth.getToken()) {
                    window.location.href = '/login.html';
                    return;
                }
                var btn = $(this);
                if (btn.hasClass('btn-saved')) {
                    API.delete('/api/account/saved/' + encodeURIComponent(productId)).then(function () {
                        btn.html('&#9825; Save').removeClass('btn-saved');
                    });
                } else {
                    API.post('/api/account/saved', { master_product_id: parseInt(productId) }).then(function () {
                        btn.html('&#9829; Saved').addClass('btn-saved');
                    });
                }
            });

            // Load recommendations
            loadRecommendations(productId);
        })
        .catch(() => {
            $('#pdp-loading').text('Product not found.');
        });

    function loadRecommendations(pid) {
        var encodedId = encodeURIComponent(pid);

        API.get('/api/products/' + encodedId + '/recommendations/bestsellers').then(function (items) {
            if (items && items.length > 0) {
                renderCarousel('bestsellers-track', 'bestsellers-section', items);
            }
        });

        API.get('/api/products/' + encodedId + '/recommendations/similar').then(function (items) {
            if (items && items.length > 0) {
                renderCarousel('similar-track', 'similar-section', items);
            }
        });
    }

    function renderCarousel(trackId, sectionId, products) {
        var track = $('#' + trackId);
        track.empty();

        products.forEach(function (p) {
            var imgSrc = p.primary_image || '/images/default-product.svg';
            var price = p.min_price ? '₹' + Number(p.min_price).toLocaleString() : '';
            var priceRange = '';
            if (p.min_price && p.max_price && p.min_price !== p.max_price) {
                priceRange = '₹' + Number(p.min_price).toLocaleString() + ' – ₹' + Number(p.max_price).toLocaleString();
            } else {
                priceRange = price;
            }

            track.append(
                '<a href="/pdp.html?id=' + p.id + '" class="carousel-card">' +
                    '<div class="carousel-card-img"><img src="' + $('<span>').text(imgSrc).html() + '" alt="' + $('<span>').text(p.name).html() + '" /></div>' +
                    '<div class="carousel-card-info">' +
                        '<p class="carousel-card-name">' + $('<span>').text(p.name).html() + '</p>' +
                        '<p class="carousel-card-price">' + priceRange + '</p>' +
                    '</div>' +
                '</a>'
            );
        });

        $('#' + sectionId).show();
    }

    // Carousel arrow navigation
    $(document).on('click', '.carousel-arrow', function () {
        var trackId = $(this).data('target');
        var track = $('#' + trackId);
        var viewport = track.parent();
        var scrollAmount = viewport.width() * 0.8;

        if ($(this).hasClass('carousel-left')) {
            viewport.animate({ scrollLeft: viewport.scrollLeft() - scrollAmount }, 300);
        } else {
            viewport.animate({ scrollLeft: viewport.scrollLeft() + scrollAmount }, 300);
        }
    });
});
