import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { products, categories, collections } from '../data/products';
import ProductCard from '../components/ProductCard';
import './Collections.css';

const Collections = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState('featured');
  const [searchQuery, setSearchQuery] = useState('');

  // Derive filter values directly from URL params — no separate state needed
  const activeCategory = searchParams.get('category') || 'All';
  const activeCollection = searchParams.get('collection') || null;

  const getFilteredProducts = () => {
    let filtered = [...products];

    if (activeCollection) {
      const col = collections.find((c) => c.id === activeCollection);
      if (col) filtered = filtered.filter((p) => col.products.includes(p.id));
    }

    if (activeCategory !== 'All') {
      filtered = filtered.filter((p) => p.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.includes(q))
      );
    }

    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'featured':
        filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
      default:
        break;
    }

    return filtered;
  };

  const filteredProducts = getFilteredProducts();
  const activeCollectionData = collections.find((c) => c.id === activeCollection);

  const handleCategoryClick = (cat) => {
    setSearchParams(cat !== 'All' ? { category: cat } : {});
  };

  const clearCollection = () => {
    setSearchParams({});
  };

  return (
    <div className="collections-page">
      {/* Page Header */}
      {activeCollectionData ? (
        <div className="collection-hero" style={{ backgroundImage: `url(${activeCollectionData.image})` }}>
          <div className="collection-hero-overlay" />
          <div className="collection-hero-content">
            <p className="collection-hero-eyebrow">Collection</p>
            <h1 className="collection-hero-title">{activeCollectionData.name}</h1>
            <p className="collection-hero-desc">{activeCollectionData.description}</p>
            <button className="btn-clear" onClick={clearCollection}>← All Collections</button>
          </div>
        </div>
      ) : (
        <div className="page-header">
          <p className="page-eyebrow">Discover</p>
          <h1 className="page-title">All Collections</h1>
          <p className="page-subtitle">
            {products.length} handcrafted pieces across {categories.length - 1} categories
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <div className="filters-container">
          <div className="category-filters">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`filter-btn ${activeCategory === cat && !activeCollection ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="filters-right">
            <div className="search-input-wrapper">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Search pieces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="featured">Featured First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="products-container">
        {filteredProducts.length > 0 ? (
          <>
            <p className="results-count">{filteredProducts.length} piece{filteredProducts.length !== 1 ? 's' : ''} found</p>
            <div className="products-grid-full">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        ) : (
          <div className="no-results">
            <span className="no-results-icon">◇</span>
            <h3>No pieces found</h3>
            <p>Try adjusting your filters or search query</p>
            <button className="btn btn-outline" onClick={() => { setSearchQuery(''); setSearchParams({}); }}>
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Collections;
