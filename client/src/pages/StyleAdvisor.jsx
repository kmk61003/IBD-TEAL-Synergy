import { useState } from 'react';
import { Link } from 'react-router-dom';
import { products } from '../data/products';
import {
  styleQuizQuestions,
  calculateStyleProfile,
  getRecommendations,
  getStyleDescription,
} from '../services/aiRecommender';
import ProductCard from '../components/ProductCard';
import './StyleAdvisor.css';

const STATES = {
  INTRO: 'intro',
  QUIZ: 'quiz',
  PROCESSING: 'processing',
  RESULTS: 'results',
};

const StyleAdvisor = () => {
  const [uiState, setUiState] = useState(STATES.INTRO);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [styleProfile, setStyleProfile] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  const handleStart = () => {
    setAnswers([]);
    setCurrentQuestion(0);
    setUiState(STATES.QUIZ);
  };

  const handleAnswer = (value) => {
    const newAnswers = [...answers, value];
    setAnswers(newAnswers);

    if (currentQuestion < styleQuizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Process results
      setUiState(STATES.PROCESSING);
      setTimeout(() => {
        const profile = calculateStyleProfile(newAnswers);
        const recs = getRecommendations(products, profile.primaryStyle, profile.secondaryStyle);
        setStyleProfile(profile);
        setRecommendations(recs);
        setUiState(STATES.RESULTS);
      }, 2200);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setAnswers(answers.slice(0, -1));
    } else {
      setUiState(STATES.INTRO);
    }
  };

  const handleRetake = () => {
    setUiState(STATES.INTRO);
    setAnswers([]);
    setCurrentQuestion(0);
    setStyleProfile(null);
    setRecommendations([]);
  };

  const progress = ((currentQuestion) / styleQuizQuestions.length) * 100;
  const question = styleQuizQuestions[currentQuestion];

  const primaryDesc = styleProfile ? getStyleDescription(styleProfile.primaryStyle) : null;
  const secondaryDesc = styleProfile ? getStyleDescription(styleProfile.secondaryStyle) : null;

  return (
    <div className="sa-page">
      {/* Intro */}
      {uiState === STATES.INTRO && (
        <div className="sa-intro">
          <div className="sa-intro-bg" />
          <div className="sa-intro-content">
            <div className="sa-ai-badge">
              <span className="sa-ai-dot" />
              <span>AI Style Engine</span>
            </div>
            <h1 className="sa-intro-title">
              Discover Your
              <br />
              <span className="sa-intro-accent">Jewellery Style</span>
            </h1>
            <p className="sa-intro-desc">
              Our intelligent Style Advisor analyses your aesthetic preferences, lifestyle,
              and personality to curate a personalised collection that's uniquely yours.
              Answer 5 quick questions to unlock your style profile.
            </p>
            <div className="sa-features">
              {[
                { icon: '✦', text: '5 curated questions' },
                { icon: '⬡', text: 'AI-powered analysis' },
                { icon: '◆', text: 'Personalised picks' },
              ].map((f) => (
                <div key={f.text} className="sa-feature">
                  <span className="sa-feature-icon">{f.icon}</span>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
            <button className="sa-start-btn" onClick={handleStart}>
              Start Style Quiz →
            </button>
          </div>
        </div>
      )}

      {/* Quiz */}
      {uiState === STATES.QUIZ && (
        <div className="sa-quiz">
          <div className="sa-quiz-container">
            {/* Progress */}
            <div className="sa-progress-wrapper">
              <div className="sa-progress-bar">
                <div
                  className="sa-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="sa-progress-text">
                {currentQuestion + 1} / {styleQuizQuestions.length}
              </span>
            </div>

            {/* Question */}
            <div className="sa-question-card">
              <div className="sa-question-number">Question {currentQuestion + 1}</div>
              <h2 className="sa-question-text">{question.question}</h2>
              <div className="sa-options">
                {question.options.map((option) => (
                  <button
                    key={option.value + option.label}
                    className="sa-option"
                    onClick={() => handleAnswer(option.value)}
                  >
                    <span className="sa-option-icon">{option.icon}</span>
                    <span className="sa-option-label">{option.label}</span>
                    <svg
                      className="sa-option-arrow"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </button>
                ))}
              </div>
              <button className="sa-back-btn" onClick={handleBack}>
                ← {currentQuestion === 0 ? 'Back to intro' : 'Previous question'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Processing */}
      {uiState === STATES.PROCESSING && (
        <div className="sa-processing">
          <div className="sa-processing-content">
            <div className="sa-spinner">
              <div className="sa-spinner-ring" />
              <span className="sa-spinner-icon">✦</span>
            </div>
            <h2 className="sa-processing-title">Analysing Your Style...</h2>
            <p className="sa-processing-desc">
              Our AI is curating personalised recommendations based on your unique preferences.
            </p>
            <div className="sa-processing-steps">
              {[
                'Processing aesthetic preferences...',
                'Matching with curated collections...',
                'Generating personalised recommendations...',
              ].map((s, i) => (
                <div key={s} className="sa-processing-step" style={{ animationDelay: `${i * 0.5}s` }}>
                  <div className="sa-step-dot" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {uiState === STATES.RESULTS && styleProfile && (
        <div className="sa-results">
          <div className="sa-results-container">
            {/* Style Profile Header */}
            <div
              className="sa-profile-header"
              style={{ '--accent-colour': primaryDesc.colour }}
            >
              <div className="sa-profile-badge">
                <span>Your Style Profile</span>
              </div>
              <div className="sa-profile-main">
                <div className="sa-profile-emoji">{primaryDesc.emoji}</div>
                <div className="sa-profile-text">
                  <p className="sa-profile-subtitle">{primaryDesc.subtitle}</p>
                  <h1 className="sa-profile-title">{primaryDesc.title}</h1>
                  <p className="sa-profile-description">{primaryDesc.description}</p>
                </div>
              </div>

              {secondaryDesc && (
                <div className="sa-secondary-style">
                  <span className="sa-secondary-label">Secondary style influence:</span>
                  <div className="sa-secondary-badge">
                    <span>{secondaryDesc.emoji}</span>
                    <span>{secondaryDesc.subtitle}</span>
                  </div>
                </div>
              )}

              <div className="sa-style-scores">
                {Object.entries(styleProfile.scores)
                  .sort((a, b) => b[1] - a[1])
                  .map(([style, score]) => {
                    const desc = getStyleDescription(style);
                    return (
                      <div key={style} className="sa-score-row">
                        <span className="sa-score-label">{desc.subtitle}</span>
                        <div className="sa-score-bar">
                          <div
                            className="sa-score-fill"
                            style={{
                              width: `${(score / styleQuizQuestions.length) * 100}%`,
                              background: desc.colour,
                            }}
                          />
                        </div>
                        <span className="sa-score-value">{score}/{styleQuizQuestions.length}</span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Recommendations */}
            <div className="sa-recommendations">
              <div className="sa-rec-header">
                <div className="sa-ai-tag">
                  <span className="sa-ai-dot" />
                  <span>AI Curated for You</span>
                </div>
                <h2 className="sa-rec-title">Your Personal Collection</h2>
                <p className="sa-rec-desc">
                  Based on your {primaryDesc.subtitle.toLowerCase()} style profile, we've handpicked these pieces just for you.
                </p>
              </div>
              <div className="sa-rec-grid">
                {recommendations.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="sa-results-actions">
              <button className="btn btn-outline" onClick={handleRetake}>
                ↺ Retake Quiz
              </button>
              <Link to="/collections" className="btn btn-primary">
                Browse All Collections
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StyleAdvisor;
