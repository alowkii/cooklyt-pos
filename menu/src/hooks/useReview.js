import { useState } from 'react';

export function useReview(tableId, showToast) {
  const reviewKey = `review_done_${tableId}`;
  const [reviewDone, setReviewDone] = useState(() => !!localStorage.getItem(reviewKey));
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewFoodRating, setReviewFoodRating] = useState(0);
  const [reviewServiceRating, setReviewServiceRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  async function submitReview() {
    if (!reviewRating || reviewSubmitting) return;
    setReviewSubmitting(true);
    try {
      const res = await fetch('/api/public/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          overallRating:   reviewRating,
          foodRating:      reviewFoodRating    || null,
          serviceRating:   reviewServiceRating || null,
          comment:         reviewComment.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      localStorage.setItem(reviewKey, '1');
      setReviewSubmitted(true);
      setTimeout(() => setReviewDone(true), 2500);
    } catch {
      showToast('Could not submit review. Please try again.');
    } finally {
      setReviewSubmitting(false);
    }
  }

  function dismissReview() {
    localStorage.setItem(reviewKey, '1');
    setReviewDone(true);
  }

  return {
    reviewDone, reviewSubmitted,
    reviewRating, setReviewRating,
    reviewFoodRating, setReviewFoodRating,
    reviewServiceRating, setReviewServiceRating,
    reviewComment, setReviewComment,
    reviewSubmitting,
    submitReview, dismissReview,
  };
}
