// Style profiles and their associated product tags
const styleProfiles = {
  elegant: ['classic', 'luxury', 'formal', 'timeless'],
  minimalist: ['everyday', 'minimalist', 'stackable', 'versatile'],
  bold: ['statement', 'bold', 'evening', 'luxury'],
  romantic: ['romantic', 'gift', 'personalised', 'charm'],
  bohemian: ['colourful', 'unique', 'charm', 'personalised'],
  modern: ['trendy', 'layering', 'modern', 'everyday'],
  vintage: ['vintage', 'art-deco', 'classic'],
};

// Quiz questions for the style advisor
export const styleQuizQuestions = [
  {
    id: 1,
    question: 'What best describes your personal style?',
    options: [
      { label: 'Timeless & Classic', value: 'elegant', icon: '💎' },
      { label: 'Clean & Minimal', value: 'minimalist', icon: '✨' },
      { label: 'Bold & Daring', value: 'bold', icon: '🔥' },
      { label: 'Romantic & Feminine', value: 'romantic', icon: '🌸' },
      { label: 'Free-spirited & Bohemian', value: 'bohemian', icon: '🌿' },
    ],
  },
  {
    id: 2,
    question: 'What occasions do you typically shop for jewellery for?',
    options: [
      { label: 'Everyday wear', value: 'minimalist', icon: '☀️' },
      { label: 'Special occasions & events', value: 'elegant', icon: '🥂' },
      { label: 'Date nights', value: 'romantic', icon: '🌹' },
      { label: 'Parties & nights out', value: 'bold', icon: '🎉' },
      { label: 'Festivals & outdoor events', value: 'bohemian', icon: '🎵' },
    ],
  },
  {
    id: 3,
    question: 'Which metal do you prefer?',
    options: [
      { label: 'White Gold or Platinum', value: 'elegant', icon: '🤍' },
      { label: 'Yellow Gold', value: 'modern', icon: '💛' },
      { label: 'Rose Gold', value: 'romantic', icon: '🩷' },
      { label: 'Silver', value: 'minimalist', icon: '🩶' },
      { label: 'Mixed metals', value: 'bohemian', icon: '🎨' },
    ],
  },
  {
    id: 4,
    question: 'How would you describe your jewellery budget per piece?',
    options: [
      { label: 'Under £300', value: 'minimalist', icon: '💰' },
      { label: '£300 – £700', value: 'modern', icon: '💰💰' },
      { label: '£700 – £1,500', value: 'romantic', icon: '💰💰💰' },
      { label: '£1,500+', value: 'elegant', icon: '💰💰💰💰' },
    ],
  },
  {
    id: 5,
    question: 'Which jewellery icon inspires you most?',
    options: [
      { label: 'Audrey Hepburn — Classic sophistication', value: 'elegant', icon: '🎬' },
      { label: 'Rihanna — Fearless & fierce', value: 'bold', icon: '🎤' },
      { label: 'Zoe Kravitz — Cool minimalism', value: 'minimalist', icon: '😎' },
      { label: 'Florence Welch — Poetic & romantic', value: 'romantic', icon: '🌷' },
      { label: 'Vanessa Hudgens — Boho chic', value: 'bohemian', icon: '🌻' },
    ],
  },
];

/**
 * Calculate the dominant style profile from quiz answers
 * @param {string[]} answers - Array of style values from quiz answers
 * @returns {object} - { primaryStyle, secondaryStyle, scores }
 */
export const calculateStyleProfile = (answers) => {
  const scores = {};
  answers.forEach((answer) => {
    scores[answer] = (scores[answer] || 0) + 1;
  });

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return {
    primaryStyle: sorted[0]?.[0] || 'elegant',
    secondaryStyle: sorted[1]?.[0] || 'minimalist',
    scores,
  };
};

/**
 * Score a product based on how well it matches the user's style profile
 * @param {object} product
 * @param {string} primaryStyle
 * @param {string} secondaryStyle
 * @returns {number} score 0-10
 */
const scoreProduct = (product, primaryStyle, secondaryStyle) => {
  let score = 0;
  const profile = product.styleProfile || [];

  if (profile.includes(primaryStyle)) score += 5;
  if (profile.includes(secondaryStyle)) score += 3;

  // Bonus for related style tags
  const primaryTags = styleProfiles[primaryStyle] || [];
  const secondaryTags = styleProfiles[secondaryStyle] || [];
  product.tags?.forEach((tag) => {
    if (primaryTags.includes(tag)) score += 1;
    if (secondaryTags.includes(tag)) score += 0.5;
  });

  // Slight randomness to keep recommendations fresh
  score += Math.random() * 0.5;

  return Math.min(score, 10);
};

/**
 * Get AI-powered product recommendations based on style profile
 * @param {object[]} products - All products
 * @param {string} primaryStyle
 * @param {string} secondaryStyle
 * @param {number} limit
 * @returns {object[]} - Top recommended products
 */
export const getRecommendations = (products, primaryStyle, secondaryStyle, limit = 6) => {
  const scored = products.map((product) => ({
    ...product,
    score: scoreProduct(product, primaryStyle, secondaryStyle),
  }));

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
};

/**
 * Get style profile description
 */
export const getStyleDescription = (style) => {
  const descriptions = {
    elegant: {
      title: 'The Connoisseur',
      subtitle: 'Timeless Elegance',
      description:
        'You have impeccable taste and appreciate the finest craftsmanship. Classic designs with high-quality gemstones speak to your refined sensibility.',
      colour: '#c9a96e',
      emoji: '💎',
    },
    minimalist: {
      title: 'The Curator',
      subtitle: 'Modern Minimalism',
      description:
        'Less is more in your world. You appreciate clean lines, quality materials, and pieces that make a quiet statement through craftsmanship alone.',
      colour: '#6b7280',
      emoji: '✨',
    },
    bold: {
      title: 'The Trailblazer',
      subtitle: 'Fearless Expression',
      description:
        'You wear jewellery as armour and art. Statement pieces that turn heads and start conversations are your signature.',
      colour: '#dc2626',
      emoji: '🔥',
    },
    romantic: {
      title: 'The Dreamer',
      subtitle: 'Romantic Soul',
      description:
        'Every piece tells a love story. You gravitate toward delicate designs with meaningful symbolism and warm, feminine aesthetics.',
      colour: '#ec4899',
      emoji: '🌸',
    },
    bohemian: {
      title: 'The Free Spirit',
      subtitle: 'Bohemian Rhapsody',
      description:
        'Your jewellery reflects your adventurous soul. Unique stones, earthy textures, and one-of-a-kind pieces that feel like you found them on a world tour.',
      colour: '#059669',
      emoji: '🌿',
    },
    modern: {
      title: 'The Trendsetter',
      subtitle: 'Contemporary Chic',
      description:
        'You stay ahead of the curve with your jewellery choices. Mixing metals, layering pieces, and adapting to trends while maintaining your own edge.',
      colour: '#0d9488',
      emoji: '⚡',
    },
    vintage: {
      title: 'The Historian',
      subtitle: 'Vintage Glamour',
      description:
        'You cherish the stories behind every piece. Art Deco patterns, estate jewellery aesthetics, and craftsmanship from another era.',
      colour: '#7c3aed',
      emoji: '🏛️',
    },
  };

  return descriptions[style] || descriptions.elegant;
};
