import { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import './OrderConfirmation.css';

const OrderConfirmation = () => {
  const { state } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!state) {
    return (
      <div className="oc-not-found">
        <h2>No order found</h2>
        <Link to="/" className="btn btn-primary">Go Home</Link>
      </div>
    );
  }

  const { orderId, items, orderTotal, delivery, estimatedDelivery } = state;

  return (
    <div className="oc-page">
      <div className="oc-container">
        {/* Success Header */}
        <div className="oc-success">
          <div className="oc-check-circle">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <h1 className="oc-title">Order Confirmed!</h1>
            <p className="oc-subtitle">
              Thank you, {delivery.firstName}! Your order has been placed and is being prepared.
            </p>
          </div>
        </div>

        {/* Order Info Banner */}
        <div className="oc-info-banner">
          <div className="oc-info-item">
            <span className="oc-info-label">Order Number</span>
            <span className="oc-info-value">#{orderId}</span>
          </div>
          <div className="oc-info-divider" />
          <div className="oc-info-item">
            <span className="oc-info-label">Estimated Delivery</span>
            <span className="oc-info-value">{estimatedDelivery}</span>
          </div>
          <div className="oc-info-divider" />
          <div className="oc-info-item">
            <span className="oc-info-label">Order Total</span>
            <span className="oc-info-value gold">£{orderTotal.toLocaleString()}</span>
          </div>
          <div className="oc-info-divider" />
          <div className="oc-info-item">
            <span className="oc-info-label">Confirmation Email</span>
            <span className="oc-info-value">{delivery.email}</span>
          </div>
        </div>

        <div className="oc-layout">
          {/* Items */}
          <div className="oc-items-section">
            <h2 className="oc-section-title">Items Ordered</h2>
            <div className="oc-items">
              {items.map((item) => (
                <div key={item.id} className="oc-item">
                  <img src={item.image} alt={item.name} className="oc-item-image" />
                  <div className="oc-item-info">
                    <span className="oc-item-category">{item.category}</span>
                    <span className="oc-item-name">{item.name}</span>
                    <span className="oc-item-material">{item.material}</span>
                    <span className="oc-item-qty">Qty: {item.quantity}</span>
                  </div>
                  <span className="oc-item-price">£{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Details */}
          <div className="oc-sidebar">
            <div className="oc-delivery-card">
              <h3 className="oc-card-title">Delivering to</h3>
              <div className="oc-address">
                <p className="oc-name">{delivery.firstName} {delivery.lastName}</p>
                <p>{delivery.address}</p>
                <p>{delivery.city}, {delivery.postcode}</p>
                <p>{delivery.country}</p>
              </div>
            </div>

            <div className="oc-steps">
              <h3 className="oc-card-title">What Happens Next?</h3>
              {[
                { icon: '📧', step: 'Confirmation email sent', desc: 'A detailed receipt has been sent to your email.' },
                { icon: '💎', step: 'Quality inspection', desc: 'Our jewellers are preparing your order with care.' },
                { icon: '📦', step: 'Dispatch', desc: 'Your order will be dispatched within 1–2 business days.' },
                { icon: '🚚', step: 'Delivery', desc: `Expected by ${estimatedDelivery} via tracked courier.` },
              ].map((s, i) => (
                <div key={i} className="oc-step">
                  <div className="oc-step-icon">{s.icon}</div>
                  <div className="oc-step-text">
                    <span className="oc-step-name">{s.step}</span>
                    <span className="oc-step-desc">{s.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="oc-actions">
          <Link to="/collections" className="btn btn-outline">Continue Shopping</Link>
          <Link to="/style-advisor" className="btn btn-teal">
            <span>✦</span> Explore Style Recommendations
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
