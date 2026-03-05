import { Link } from 'react-router-dom';
import { getFeaturedProducts, collections } from '../data/products';
import ProductCard from '../components/ProductCard';
import './Home.css';

const Home = () => {
  const featured = getFeaturedProducts();

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-overlay" />
          <img
            src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1600&q=80"
            alt="Jewellery hero"
            className="hero-image"
          />
        </div>
        <div className="hero-content">
          <p className="hero-eyebrow">Curated Fine Jewellery</p>
          <h1 className="hero-title">
            Wear Your
            <br />
            <span className="hero-accent">Story</span>
          </h1>
          <p className="hero-description">
            Handcrafted pieces that capture life's most precious moments.
            Discover our curated collections or let our AI Style Advisor find
            your perfect match.
          </p>
          <div className="hero-actions">
            <Link to="/collections" className="btn btn-primary">
              Shop Collections
            </Link>
            <Link to="/style-advisor" className="btn btn-outline">
              <span className="ai-spark">✦</span> AI Style Advisor
            </Link>
          </div>
        </div>
        <div className="hero-scroll">
          <span>Scroll to explore</span>
          <div className="scroll-line" />
        </div>
      </section>

      {/* Collections Banner */}
      <section className="collections-section">
        <div className="section-container">
          <div className="section-header">
            <p className="section-eyebrow">Curated for You</p>
            <h2 className="section-title">Our Collections</h2>
          </div>
          <div className="collections-grid">
            {collections.map((col) => (
              <Link
                key={col.id}
                to={`/collections?collection=${col.id}`}
                className="collection-card"
              >
                <img src={col.image} alt={col.name} className="collection-image" />
                <div className="collection-overlay">
                  <h3 className="collection-name">{col.name}</h3>
                  <p className="collection-desc">{col.description}</p>
                  <span className="collection-cta">Explore →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="featured-section">
        <div className="section-container">
          <div className="section-header">
            <p className="section-eyebrow">Editor's Picks</p>
            <h2 className="section-title">Featured Pieces</h2>
          </div>
          <div className="products-grid">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="section-footer">
            <Link to="/collections" className="btn btn-outline">View All Pieces</Link>
          </div>
        </div>
      </section>

      {/* AI Advisor Banner */}
      <section className="ai-banner">
        <div className="ai-banner-content">
          <div className="ai-icon-ring">
            <span className="ai-icon">✦</span>
          </div>
          <div className="ai-text">
            <h2 className="ai-title">Discover Your Style DNA</h2>
            <p className="ai-subtitle">
              Our AI Style Advisor analyses your preferences and lifestyle to curate
              personalised jewellery recommendations just for you.
            </p>
          </div>
          <Link to="/style-advisor" className="btn btn-teal">
            Take the Style Quiz
          </Link>
        </div>
      </section>

      {/* Value Props */}
      <section className="values-section">
        <div className="section-container">
          <div className="values-grid">
            {[
              { icon: '⬡', title: 'Ethically Sourced', desc: 'All our gemstones are certified conflict-free and sustainably sourced.' },
              { icon: '✦', title: 'Expert Craftsmanship', desc: 'Each piece is handcrafted by master jewellers with decades of experience.' },
              { icon: '◆', title: 'Certificate of Authenticity', desc: 'Every purchase comes with a signed certificate and lifetime warranty.' },
              { icon: '↺', title: 'Free Returns', desc: 'Not in love? Return within 30 days for a full refund, no questions asked.' },
            ].map((v) => (
              <div key={v.title} className="value-card">
                <span className="value-icon">{v.icon}</span>
                <h3 className="value-title">{v.title}</h3>
                <p className="value-desc">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            <span className="footer-logo">◆ TEAL Jewellery</span>
            <p className="footer-tagline">Every piece tells a story. What's yours?</p>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <h4>Shop</h4>
              <Link to="/collections">All Collections</Link>
              <Link to="/collections?category=Rings">Rings</Link>
              <Link to="/collections?category=Necklaces">Necklaces</Link>
              <Link to="/collections?category=Earrings">Earrings</Link>
              <Link to="/collections?category=Bracelets">Bracelets</Link>
            </div>
            <div className="footer-col">
              <h4>Discover</h4>
              <Link to="/style-advisor">AI Style Advisor</Link>
              <Link to="/collections">New Arrivals</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2025 TEAL Jewellery. All rights reserved. Built for Microsoft Hackathon.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
