import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProductById, products } from '../data/products';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const product = getProductById(id);
  const { addToCart, items } = useCart();
  const [activeImage, setActiveImage] = useState(0);
  const [addedToast, setAddedToast] = useState(false);

  if (!product) {
    return (
      <div className="not-found">
        <h2>Product not found</h2>
        <Link to="/collections" className="btn btn-outline">Back to Collections</Link>
      </div>
    );
  }

  const inCart = items.some((i) => i.id === product.id);

  const handleAddToCart = () => {
    addToCart(product);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2500);
  };

  // Similar products
  const similar = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <div className="product-detail">
      {addedToast && (
        <div className="toast">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Added to your bag!
        </div>
      )}

      <div className="detail-container">
        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <Link to="/">Home</Link>
          <span>›</span>
          <Link to="/collections">Collections</Link>
          <span>›</span>
          <Link to={`/collections?category=${product.category}`}>{product.category}</Link>
          <span>›</span>
          <span className="breadcrumb-current">{product.name}</span>
        </nav>

        <div className="detail-grid">
          {/* Images */}
          <div className="detail-images">
            <div className="main-image-wrapper">
              <img
                src={product.images[activeImage]}
                alt={product.name}
                className="main-image"
              />
              {discount && <span className="discount-badge">-{discount}%</span>}
            </div>
            {product.images.length > 1 && (
              <div className="image-thumbnails">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    className={`thumbnail ${activeImage === i ? 'active' : ''}`}
                    onClick={() => setActiveImage(i)}
                  >
                    <img src={img} alt={`${product.name} view ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="detail-info">
            <span className="detail-category">{product.category}</span>
            <h1 className="detail-name">{product.name}</h1>

            <div className="detail-rating">
              <span className="stars">{'★'.repeat(Math.floor(product.rating))}{'☆'.repeat(5 - Math.floor(product.rating))}</span>
              <span className="rating-value">{product.rating}</span>
              <span className="review-count">({product.reviews} reviews)</span>
            </div>

            <div className="detail-price">
              <span className="price-main">£{product.price.toLocaleString()}</span>
              {product.originalPrice && (
                <>
                  <span className="price-was">£{product.originalPrice.toLocaleString()}</span>
                  <span className="price-save">Save £{(product.originalPrice - product.price).toLocaleString()}</span>
                </>
              )}
            </div>

            <p className="detail-description">{product.description}</p>

            <div className="detail-specs">
              <div className="spec-row">
                <span className="spec-label">Material</span>
                <span className="spec-value">{product.material}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Gemstone</span>
                <span className="spec-value">{product.gemstone}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Category</span>
                <span className="spec-value">{product.category}</span>
              </div>
            </div>

            <div className="detail-tags">
              {product.tags.map((tag) => (
                <span key={tag} className="tag">#{tag}</span>
              ))}
            </div>

            <div className="detail-actions">
              <button
                className={`add-to-cart-btn ${inCart ? 'in-cart' : ''}`}
                onClick={handleAddToCart}
              >
                {inCart ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Added to Bag
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <path d="M16 10a4 4 0 01-8 0"/>
                    </svg>
                    Add to Bag
                  </>
                )}
              </button>
              <Link to="/cart" className="view-bag-btn">View Bag →</Link>
            </div>

            <div className="detail-assurance">
              {[
                { icon: '✦', text: 'Certificate of Authenticity included' },
                { icon: '↺', text: 'Free 30-day returns' },
                { icon: '⬡', text: 'Ethically sourced gemstones' },
              ].map((item) => (
                <div key={item.text} className="assurance-item">
                  <span className="assurance-icon">{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Similar Products */}
        {similar.length > 0 && (
          <div className="similar-section">
            <h2 className="similar-title">You May Also Love</h2>
            <div className="similar-grid">
              {similar.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
