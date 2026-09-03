import { State } from './state';
import { Action } from './Action';
import { Reducer } from 'react';
import { FlashcardData } from './flashcard-data';
import {
  describeRestoredFlashcards,
  FlashcardManager,
  higherRankTaxonOf,
} from './flashcard-manager';

export const reducer: Reducer<State, Action> = (state: State, action: Action): State => {
  console.debug('Action dispatched', action);
  switch (action.type) {
    case 'PLACE_SELECTED': {
      return {
        ...state,
        selectedPlace: action.place,
      };
    }
    case 'INATURALIST_URL_APPLIED': {
      return {
        ...state,
        selectedPlace: action.place,
        // The URL is replayed exactly as pasted, including which of the app's
        // own defaults do not apply.
        speciesFilters: action.filters,
        filtersFromPastedUrl: true,
      };
    }
    case 'TAXA_SCOPE_SELECTED': {
      return {
        ...state,
        taxaScope: action.taxaScope,
      };
    }
    case 'ALL_SPECIES_LOADED': {
      return {
        ...state,
        flashcards: new FlashcardManager(action.allSpecies),
      };
    }
    case 'REVEAL_FLASHCARD': {
      return {
        ...state,
        flashcardRevealed: true,
      };
    }
    case 'REMOVE_FLASHCARD': {
      if (!state.flashcards) {
        throw new Error('foo');
      }
      state.flashcards.removeCurrentFlashcard();
      return { ...state, flashcardRevealed: false };
    }
    case 'RAISE_FLASHCARD_RANK': {
      if (!state.flashcards) {
        throw new Error('foo');
      }
      const higherRankTaxon = higherRankTaxonOf(state.flashcards.current);
      if (!higherRankTaxon) {
        return state;
      }
      const restoredNames = state.flashcards.raiseCurrentFlashcardRank();
      return {
        ...state,
        flashcardRevealed: false,
        flashcardNotice: describeRestoredFlashcards(restoredNames, higherRankTaxon),
      };
    }
    case 'DISMISS_FLASHCARD_NOTICE': {
      return { ...state, flashcardNotice: undefined };
    }
    case 'SCORE_FLASHCARD': {
      if (!state.flashcards) {
        throw new Error('foo');
      }
      state.flashcards.processScoredFlashcard(state.flashcards.current, action.flashcardRating);
      state.flashcards.loadNextFlashcard();
      return {
        ...state,
        flashcardRevealed: false,
        score: calculateScore(state.flashcards.inRotation),
      };
    }
    case 'FLASHCARD_IMAGE_METADATA_LOADED': {
      if (!state.flashcards) {
        throw new Error('foo');
      }
      shuffleArray(action.images);
      state.flashcards.current.images = action.images;
      return { ...state };
    }
    case 'FLASHCARD_ANCESTORS_LOADED': {
      if (!state.flashcards) {
        throw new Error('foo');
      }
      state.flashcards.current.ancestors = action.ancestors;
      return { ...state };
    }
    default: {
      // Redux has its own action that gets called upon initializing, and we need to handle
      // that here.
      return state;
    }
  }
};

const calculateScore = (flashcards: FlashcardData[]) => {
  return flashcards.reduce((sum, flashcard) => {
    return sum + 10 * Math.min(flashcard.streak, 3);
  }, 0);
};

const shuffleArray = (array: unknown[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
};
