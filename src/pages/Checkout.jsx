import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './Checkout.css';

const steps = ['Delivery', 'Payment', 'Review'];

const Checkout = () => {
  const { items, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [orderPlaced, setOrderPlaced] = useState(false);

  const [delivery, setDelivery] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postcode: '',
    country: 'United Kingdom',
  });

  const [payment, setPayment] = useState({
    cardName: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });

  const shipping = cartTotal >= 500 ? 0 : 15;
  const orderTotal = cartTotal + shipping;

  const validateDelivery = () => {
    const newErrors = {};
    if (!delivery.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!delivery.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!delivery.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) newErrors.email = 'Valid email is required';
    if (!delivery.address.trim()) newErrors.address = 'Address is required';
    if (!delivery.city.trim()) newErrors.city = 'City is required';
    if (!delivery.postcode.trim()) newErrors.postcode = 'Postcode is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePayment = () => {
    const newErrors = {};
    if (!payment.cardName.trim()) newErrors.cardName = 'Name on card is required';
    if (!payment.cardNumber.replace(/\s/g, '').match(/^\d{16}$/)) newErrors.cardNumber = 'Valid 16-digit card number is required';
    if (!payment.expiry.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) newErrors.expiry = 'Valid expiry date required (MM/YY)';
    if (!payment.cvv.match(/^\d{3,4}$/)) newErrors.cvv = 'Valid CVV is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 0 && !validateDelivery()) return;
    if (step === 1 && !validatePayment()) return;
    setErrors({});
    if (step < steps.length - 1) setStep(step + 1);
  };

  const handlePlaceOrder = () => {
    const orderId = `TL${Date.now().toString().slice(-8)}`;
    const orderItems = [...items];
    const orderCartTotal = cartTotal;
    setOrderPlaced(true);
    clearCart();
    navigate('/order-confirmation', {
      state: {
        orderId,
        items: orderItems,
        orderTotal: orderCartTotal + (orderCartTotal >= 500 ? 0 : 15),
        delivery,
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }),
      },
    });
  };

  const formatCardNumber = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 2) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  // Redirect to cart if bag is empty and no order was just placed
  useEffect(() => {
    if (items.length === 0 && !orderPlaced) {
      navigate('/cart');
    }
  }, [items.length, orderPlaced, navigate]);

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-header">
          <h1 className="checkout-title">Checkout</h1>
          <div className="steps-indicator">
            {steps.map((s, i) => (
              <div key={s} className={`step-item ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
                <div className="step-circle">
                  {i < step ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className="step-label">{s}</span>
                {i < steps.length - 1 && <div className="step-line" />}
              </div>
            ))}
          </div>
        </div>

        <div className="checkout-layout">
          {/* Form */}
          <div className="checkout-form-section">
            {/* Delivery Step */}
            {step === 0 && (
              <div className="form-step">
                <h2 className="form-step-title">Delivery Details</h2>
                <div className="form-grid">
                  <div className={`form-group ${errors.firstName ? 'has-error' : ''}`}>
                    <label>First Name *</label>
                    <input
                      type="text"
                      value={delivery.firstName}
                      onChange={(e) => setDelivery({ ...delivery, firstName: e.target.value })}
                      placeholder="Jane"
                    />
                    {errors.firstName && <span className="error-msg">{errors.firstName}</span>}
                  </div>
                  <div className={`form-group ${errors.lastName ? 'has-error' : ''}`}>
                    <label>Last Name *</label>
                    <input
                      type="text"
                      value={delivery.lastName}
                      onChange={(e) => setDelivery({ ...delivery, lastName: e.target.value })}
                      placeholder="Doe"
                    />
                    {errors.lastName && <span className="error-msg">{errors.lastName}</span>}
                  </div>
                  <div className={`form-group full-width ${errors.email ? 'has-error' : ''}`}>
                    <label>Email Address *</label>
                    <input
                      type="email"
                      value={delivery.email}
                      onChange={(e) => setDelivery({ ...delivery, email: e.target.value })}
                      placeholder="jane@example.com"
                    />
                    {errors.email && <span className="error-msg">{errors.email}</span>}
                  </div>
                  <div className="form-group full-width">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      value={delivery.phone}
                      onChange={(e) => setDelivery({ ...delivery, phone: e.target.value })}
                      placeholder="+44 7700 900000"
                    />
                  </div>
                  <div className={`form-group full-width ${errors.address ? 'has-error' : ''}`}>
                    <label>Street Address *</label>
                    <input
                      type="text"
                      value={delivery.address}
                      onChange={(e) => setDelivery({ ...delivery, address: e.target.value })}
                      placeholder="123 High Street, Flat 4"
                    />
                    {errors.address && <span className="error-msg">{errors.address}</span>}
                  </div>
                  <div className={`form-group ${errors.city ? 'has-error' : ''}`}>
                    <label>City *</label>
                    <input
                      type="text"
                      value={delivery.city}
                      onChange={(e) => setDelivery({ ...delivery, city: e.target.value })}
                      placeholder="London"
                    />
                    {errors.city && <span className="error-msg">{errors.city}</span>}
                  </div>
                  <div className={`form-group ${errors.postcode ? 'has-error' : ''}`}>
                    <label>Postcode *</label>
                    <input
                      type="text"
                      value={delivery.postcode}
                      onChange={(e) => setDelivery({ ...delivery, postcode: e.target.value })}
                      placeholder="SW1A 1AA"
                    />
                    {errors.postcode && <span className="error-msg">{errors.postcode}</span>}
                  </div>
                  <div className="form-group full-width">
                    <label>Country</label>
                    <select
                      value={delivery.country}
                      onChange={(e) => setDelivery({ ...delivery, country: e.target.value })}
                    >
                      <option>United Kingdom</option>
                      <option>United States</option>
                      <option>Canada</option>
                      <option>Australia</option>
                      <option>Germany</option>
                      <option>France</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Step */}
            {step === 1 && (
              <div className="form-step">
                <h2 className="form-step-title">Payment Details</h2>
                <div className="payment-notice">
                  <span>🔒</span>
                  <span>Your payment information is encrypted and secure. This is a demo — no real payments will be processed.</span>
                </div>
                <div className="form-grid">
                  <div className={`form-group full-width ${errors.cardName ? 'has-error' : ''}`}>
                    <label>Name on Card *</label>
                    <input
                      type="text"
                      value={payment.cardName}
                      onChange={(e) => setPayment({ ...payment, cardName: e.target.value })}
                      placeholder="Jane Doe"
                    />
                    {errors.cardName && <span className="error-msg">{errors.cardName}</span>}
                  </div>
                  <div className={`form-group full-width ${errors.cardNumber ? 'has-error' : ''}`}>
                    <label>Card Number *</label>
                    <input
                      type="text"
                      value={payment.cardNumber}
                      onChange={(e) => setPayment({ ...payment, cardNumber: formatCardNumber(e.target.value) })}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                    />
                    {errors.cardNumber && <span className="error-msg">{errors.cardNumber}</span>}
                  </div>
                  <div className={`form-group ${errors.expiry ? 'has-error' : ''}`}>
                    <label>Expiry Date *</label>
                    <input
                      type="text"
                      value={payment.expiry}
                      onChange={(e) => setPayment({ ...payment, expiry: formatExpiry(e.target.value) })}
                      placeholder="MM/YY"
                      maxLength={5}
                    />
                    {errors.expiry && <span className="error-msg">{errors.expiry}</span>}
                  </div>
                  <div className={`form-group ${errors.cvv ? 'has-error' : ''}`}>
                    <label>CVV *</label>
                    <input
                      type="text"
                      value={payment.cvv}
                      onChange={(e) => setPayment({ ...payment, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      placeholder="123"
                      maxLength={4}
                    />
                    {errors.cvv && <span className="error-msg">{errors.cvv}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Review Step */}
            {step === 2 && (
              <div className="form-step">
                <h2 className="form-step-title">Review Your Order</h2>

                <div className="review-section">
                  <h3>Delivery to</h3>
                  <div className="review-details">
                    <p>{delivery.firstName} {delivery.lastName}</p>
                    <p>{delivery.address}</p>
                    <p>{delivery.city}, {delivery.postcode}</p>
                    <p>{delivery.country}</p>
                    <p>{delivery.email}</p>
                  </div>
                </div>

                <div className="review-section">
                  <h3>Items</h3>
                  {items.map((item) => (
                    <div key={item.id} className="review-item">
                      <img src={item.image} alt={item.name} className="review-item-image" />
                      <div className="review-item-info">
                        <span className="review-item-name">{item.name}</span>
                        <span className="review-item-qty">Qty: {item.quantity}</span>
                      </div>
                      <span className="review-item-price">£{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="form-nav">
              {step > 0 && (
                <button className="btn-back" onClick={() => setStep(step - 1)}>
                  ← Back
                </button>
              )}
              {step < steps.length - 1 ? (
                <button className="btn-next" onClick={handleNext}>
                  Continue to {steps[step + 1]} →
                </button>
              ) : (
                <button className="btn-place-order" onClick={handlePlaceOrder}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13"/>
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                    <circle cx="5.5" cy="18.5" r="2.5"/>
                    <circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                  Place Order · £{orderTotal.toLocaleString()}
                </button>
              )}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="checkout-summary">
            <h3 className="checkout-summary-title">Your Bag</h3>
            <div className="checkout-summary-items">
              {items.map((item) => (
                <div key={item.id} className="checkout-summary-item">
                  <div className="checkout-item-img-wrapper">
                    <img src={item.image} alt={item.name} />
                    <span className="checkout-item-qty">{item.quantity}</span>
                  </div>
                  <span className="checkout-item-name">{item.name}</span>
                  <span className="checkout-item-price">£{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="checkout-summary-totals">
              <div className="checkout-total-row">
                <span>Subtotal</span>
                <span>£{cartTotal.toLocaleString()}</span>
              </div>
              <div className="checkout-total-row">
                <span>Delivery</span>
                <span>{shipping === 0 ? <span style={{ color: '#0d9488' }}>Free</span> : `£${shipping}`}</span>
              </div>
              <div className="checkout-total-row checkout-grand-total">
                <span>Total</span>
                <span>£{orderTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
