import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  const { addToCart, items } = useCart();
  const inCart = items.some((i) => i.id === product.id);

  const handleAddToCart = (e) => {
    e.preventDefault();
    addToCart(product);
  };

  return (
    <Link to={`/product/${product.id}`} className="product-card">
      <div className="product-image-wrapper">
        <img src={product.image} alt={product.name} className="product-image" loading="lazy" />
        {product.originalPrice && (
          <span className="product-badge sale-badge">Sale</span>
        )}
        {product.featured && !product.originalPrice && (
          <span className="product-badge featured-badge">Featured</span>
        )}
        <button
          className={`quick-add-btn ${inCart ? 'in-cart' : ''}`}
          onClick={handleAddToCart}
          aria-label={inCart ? 'Added to bag' : 'Add to bag'}
        >
          {inCart ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              In Bag
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              Add to Bag
            </>
          )}
        </button>
      </div>
      <div className="product-info">
        <span className="product-category">{product.category}</span>
        <h3 className="product-name">{product.name}</h3>
        <div className="product-rating">
          <span className="stars">{'★'.repeat(Math.floor(product.rating))}{'☆'.repeat(5 - Math.floor(product.rating))}</span>
          <span className="review-count">({product.reviews})</span>
        </div>
        <div className="product-price">
          <span className="price-current">£{product.price.toLocaleString()}</span>
          {product.originalPrice && (
            <span className="price-original">£{product.originalPrice.toLocaleString()}</span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
