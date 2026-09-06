import * as React from 'react';
import { Place } from '../inaturalist';
import { resolvePlaceFromSearchUrl } from '../inaturalist-url';
import { SharedQuiz } from '../quiz-link';

// A shared link names its place the way iNaturalist does, so the place behind
// it is looked up before the quiz it describes can be loaded.
export const RestoreSharedQuizStep = ({
  offlineMode,
  quiz,
  onResolvePlace,
}: {
  offlineMode: boolean;
  quiz: SharedQuiz;
  onResolvePlace: (place: Place) => void;
}) => {
  resolvePlaceFromSearchUrl(quiz, offlineMode).then(onResolvePlace);
  return <p>Loading the shared quiz...</p>;
};
