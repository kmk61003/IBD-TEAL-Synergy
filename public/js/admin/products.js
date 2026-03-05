// Admin Products JS
let currentPage = 1;
let allCategories = [];

$(document).ready(function () {
    if (!AdminAPI.checkAuth()) return;
    AdminAPI.initNav();
    $('#admin-logout').click(function (e) { e.preventDefault(); AdminAPI.logout(); });

    loadCategories();
    loadProducts(1);

    // Add product button
    $('#add-product-btn').click(function () {
        openModal();
    });

    // Close modal
    $('#close-modal').click(closeModal);
    $(document).on('click', '#product-modal', function (e) {
        if (e.target === this) closeModal();
    });

    // Product form submit
    $('#product-form').submit(function (e) {
        e.preventDefault();
        saveProduct();
    });

    // Edit product
    $(document).on('click', '.edit-btn', function () {
        const id = $(this).data('id');
        openModal(id);
    });

    // Delete product
    $(document).on('click', '.delete-btn', function () {
        const id = $(this).data('id');
        if (confirm('Are you sure you want to delete this product?')) {
            AdminAPI.delete('/api/admin/products/' + id).then(() => loadProducts(currentPage));
        }
    });

    // Variant buttons
    $('#add-variant-btn').click(function () {
        $('#variant-form-section').show();
        $('#variant-form-title').text('Add Variant');
        $('#v-id').val('');
        $('#v-sku, #v-metal, #v-size, #v-weight, #v-price, #v-discount').val('');
        $('#v-inventory').val(0);
        $('#v-status').val('active');
    });

    $('#cancel-variant-btn').click(function () {
        $('#variant-form-section').hide();
    });

    $('#save-variant-btn').click(function () {
        saveVariant();
    });

    // Edit variant
    $(document).on('click', '.edit-variant-btn', function () {
        const row = $(this).closest('tr');
        $('#variant-form-section').show();
        $('#variant-form-title').text('Edit Variant');
        $('#v-id').val(row.data('id'));
        $('#v-sku').val(row.data('sku'));
        $('#v-metal').val(row.data('metal'));
        $('#v-size').val(row.data('size'));
        $('#v-weight').val(row.data('weight'));
        $('#v-price').val(row.data('price'));
        $('#v-discount').val(row.data('discount'));
        $('#v-inventory').val(row.data('inventory'));
        $('#v-status').val(row.data('status'));
    });
});

function loadCategories() {
    AdminAPI.get('/api/admin/categories').then(cats => {
        allCategories = cats;
        const select = $('#p-categories');
        select.empty();
        cats.forEach(c => select.append(`<option value="${c.id}">${$('<span>').text(c.name).html()}</option>`));
    });
}

function loadProducts(page) {
    currentPage = page;
    AdminAPI.get('/api/admin/products?page=' + page).then(data => {
        const tbody = $('#product-list');
        tbody.empty();

        data.products.forEach(p => {
            const img = p.primary_image || '/images/default-product.svg';
            tbody.append(`
                <tr>
                    <td><img src="${img}" alt="" class="table-thumb" /></td>
                    <td>${$('<span>').text(p.name).html()}</td>
                    <td>${p.variant_count}</td>
                    <td><span class="badge badge-${p.status}">${p.status}</span></td>
                    <td>${new Date(p.created_at).toLocaleDateString()}</td>
                    <td>
                        <button class="btn btn-sm edit-btn" data-id="${p.id}">Edit</button>
                        <button class="btn btn-sm btn-danger delete-btn" data-id="${p.id}">Delete</button>
                    </td>
                </tr>
            `);
        });

        // Pagination
        const pg = data.pagination;
        const pagDiv = $('#product-pagination');
        pagDiv.empty();
        if (pg.totalPages > 1) {
            if (pg.page > 1) pagDiv.append(`<button class="btn btn-sm" onclick="loadProducts(${pg.page - 1})">Prev</button>`);
            pagDiv.append(`<span class="page-info">Page ${pg.page} of ${pg.totalPages}</span>`);
            if (pg.page < pg.totalPages) pagDiv.append(`<button class="btn btn-sm" onclick="loadProducts(${pg.page + 1})">Next</button>`);
        }
    });
}

function openModal(id) {
    $('#product-modal').show();
    $('#form-error').hide();
    $('#variant-form-section').hide();

    if (id) {
        // Edit mode
        $('#modal-title').text('Edit Product');
        $('#variants-section').show();

        AdminAPI.get('/api/admin/products/' + id).then(p => {
            $('#product-id').val(p.id);
            $('#p-name').val(p.name);
            $('#p-short-desc').val(p.short_description);
            $('#p-desc').val(p.description);
            $('#p-status').val(p.status);

            // Select categories
            const catIds = (p.categories || []).map(c => String(c.id));
            $('#p-categories').val(catIds);

            // Show existing images
            const imgDiv = $('#existing-images');
            imgDiv.empty();
            (p.images || []).forEach(img => {
                imgDiv.append(`<img src="${img.image_path}" alt="" class="existing-thumb" />`);
            });

            // Load variants
            loadVariants(p.variants || [], id);
        });
    } else {
        // Create mode
        $('#modal-title').text('Add Product');
        $('#product-id').val('');
        $('#p-name, #p-short-desc, #p-desc').val('');
        $('#p-status').val('active');
        $('#p-categories').val([]);
        $('#p-images').val('');
        $('#existing-images').empty();
        $('#variants-section').hide();
    }
}

function closeModal() {
    $('#product-modal').hide();
}

function saveProduct() {
    const id = $('#product-id').val();
    const formData = new FormData();

    formData.append('name', $('#p-name').val());
    formData.append('short_description', $('#p-short-desc').val());
    formData.append('description', $('#p-desc').val());
    formData.append('status', $('#p-status').val());

    const catIds = $('#p-categories').val() || [];
    catIds.forEach(cid => formData.append('category_ids', cid));

    const files = $('#p-images')[0].files;
    for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
    }

    const url = id ? '/api/admin/products/' + id : '/api/admin/products';
    const method = id ? 'PUT' : 'POST';

    AdminAPI.upload(url, formData, method).then(() => {
        closeModal();
        loadProducts(currentPage);
    }).catch(err => {
        $('#form-error').text(err.responseJSON?.error || 'Failed to save product.').show();
    });
}

function loadVariants(variants, productId) {
    const tbody = $('#variant-list');
    tbody.empty();

    variants.forEach(v => {
        tbody.append(`
            <tr data-id="${v.id}" data-sku="${$('<span>').text(v.sku).html()}" data-metal="${$('<span>').text(v.metal || '').html()}"
                data-size="${$('<span>').text(v.size || '').html()}" data-weight="${v.weight || ''}"
                data-price="${v.price}" data-discount="${v.discount_price || ''}"
                data-inventory="${v.inventory}" data-status="${v.status}">
                <td>${$('<span>').text(v.sku).html()}</td>
                <td>${$('<span>').text(v.metal || '—').html()}</td>
                <td>${$('<span>').text(v.size || '—').html()}</td>
                <td>${v.weight || '—'}</td>
                <td>₹${Number(v.price).toLocaleString()}</td>
                <td>${v.discount_price ? '₹' + Number(v.discount_price).toLocaleString() : '—'}</td>
                <td>${v.inventory}</td>
                <td><span class="badge badge-${v.status}">${v.status}</span></td>
                <td><button class="btn btn-sm edit-variant-btn">Edit</button></td>
            </tr>
        `);
    });

    // Store productId for variant operations
    $('#variants-section').data('product-id', productId);
}

function saveVariant() {
    const productId = $('#variants-section').data('product-id');
    const variantId = $('#v-id').val();

    const data = {
        sku: $('#v-sku').val(),
        metal: $('#v-metal').val(),
        size: $('#v-size').val(),
        weight: parseFloat($('#v-weight').val()) || null,
        price: parseFloat($('#v-price').val()),
        discount_price: parseFloat($('#v-discount').val()) || null,
        inventory: parseInt($('#v-inventory').val()) || 0,
        status: $('#v-status').val()
    };

    let promise;
    if (variantId) {
        promise = AdminAPI.put('/api/admin/products/variants/' + variantId, data);
    } else {
        promise = AdminAPI.post('/api/admin/products/' + productId + '/variants', data);
    }

    promise.then(() => {
        $('#variant-form-section').hide();
        // Reload product to refresh variants
        openModal(productId);
    }).catch(err => {
        alert(err.responseJSON?.error || 'Failed to save variant.');
    });
}
