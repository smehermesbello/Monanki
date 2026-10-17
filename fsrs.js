// fsrs.js
export function createInitialCardState() {
  return {
    state: 0,
    stability: 0,
    difficulty: 0,
    repetition: 0,
    lapses: 0,
    lastReview: null,
    nextReview: new Date().toISOString()
  };
}

export function calculateFSRS(cardState, rating) {
  const now = new Date();
  let { stability, difficulty, repetition, lapses } = cardState;

  if (cardState.state === 0) {
    difficulty = Math.max(1, Math.min(10, 5 - (rating - 3)));
    stability = rating === 1 ? 0.4 : rating === 2 ? 0.9 : rating === 3 ? 2.4 : 5.8;
  } else {
    if (rating === 1) { // Again
      lapses += 1;
      difficulty = Math.min(10, difficulty + 0.2);
      stability = Math.max(0.5, stability * 0.4);
    } else { // Hard, Good, Easy
      const easyBonus = rating === 4 ? 1.3 : 1;
      const hardPenalty = rating === 2 ? 0.8 : 1;
      
      difficulty = Math.max(1, Math.min(10, difficulty - 0.1 * (rating - 3)));
      stability = stability * (1 + (Math.exp(1) - 1) * (rating / 3) * hardPenalty * easyBonus);
    }
  }

  repetition += 1;
  const intervalDays = Math.max(1, Math.round(stability));
  const nextReviewDate = new Date();
  
  if (rating === 1) {
    nextReviewDate.setMinutes(nextReviewDate.getMinutes() + 10);
  } else {
    nextReviewDate.setDate(now.getDate() + intervalDays);
  }

  return {
    state: rating === 1 ? 1 : 2,
    stability: parseFloat(stability.toFixed(2)),
    difficulty: parseFloat(difficulty.toFixed(2)),
    repetition: repetition,
    lapses: lapses,
    lastReview: now.toISOString(),
    nextReview: nextReviewDate.toISOString()
  };
}
