import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './Cart.css';

const Cart = () => {
  const { items, removeFromCart, updateQuantity, cartTotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="cart-empty">
        <div className="cart-empty-content">
          <span className="cart-empty-icon">◇</span>
          <h2>Your bag is empty</h2>
          <p>Discover our curated jewellery collections and add your favourites.</p>
          <Link to="/collections" className="btn btn-primary">
            Browse Collections
          </Link>
        </div>
      </div>
    );
  }

  const shipping = cartTotal >= 500 ? 0 : 15;

  return (
    <div className="cart-page">
      <div className="cart-container">
        <div className="cart-header">
          <h1 className="cart-title">Your Bag</h1>
          <span className="cart-item-count">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="cart-layout">
          {/* Items */}
          <div className="cart-items">
            {items.map((item) => (
              <div key={item.id} className="cart-item">
                <Link to={`/product/${item.id}`} className="cart-item-image-link">
                  <img src={item.image} alt={item.name} className="cart-item-image" />
                </Link>
                <div className="cart-item-details">
                  <div className="cart-item-top">
                    <div>
                      <span className="cart-item-category">{item.category}</span>
                      <Link to={`/product/${item.id}`} className="cart-item-name">
                        {item.name}
                      </Link>
                      <p className="cart-item-material">{item.material}</p>
                    </div>
                    <button
                      className="remove-btn"
                      onClick={() => removeFromCart(item.id)}
                      aria-label="Remove item"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="cart-item-bottom">
                    <div className="quantity-control">
                      <button
                        className="qty-btn"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="qty-value">{item.quantity}</span>
                      <button
                        className="qty-btn"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <span className="cart-item-price">
                      £{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="order-summary">
            <h2 className="summary-title">Order Summary</h2>

            <div className="summary-rows">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>£{cartTotal.toLocaleString()}</span>
              </div>
              <div className="summary-row">
                <span>Delivery</span>
                <span>{shipping === 0 ? <span className="free-shipping">Free</span> : `£${shipping}`}</span>
              </div>
              {shipping > 0 && (
                <p className="free-shipping-note">
                  Add £{(500 - cartTotal).toLocaleString()} more for free delivery
                </p>
              )}
              <div className="summary-divider" />
              <div className="summary-row summary-total">
                <span>Total</span>
                <span>£{(cartTotal + shipping).toLocaleString()}</span>
              </div>
            </div>

            <Link to="/checkout" className="checkout-btn">
              Proceed to Checkout
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>

            <Link to="/collections" className="continue-btn">
              ← Continue Shopping
            </Link>

            <div className="summary-assurance">
              <div className="assurance-row">
                <span>🔒</span>
                <span>Secure SSL checkout</span>
              </div>
              <div className="assurance-row">
                <span>↺</span>
                <span>Free 30-day returns</span>
              </div>
              <div className="assurance-row">
                <span>✦</span>
                <span>Certificate of authenticity</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
