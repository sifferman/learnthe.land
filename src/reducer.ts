import { State } from './state';
import { displayNameOf } from './common-name';
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
      const flashcards = new FlashcardManager(action.allSpecies);
      // A shared quiz reshaped its deck before it was shared, so the same
      // changes are replayed onto the freshly loaded species.
      for (const raisedTaxon of action.raisedTaxa) {
        flashcards.raiseToTaxon(raisedTaxon);
      }
      if (state.sharedQuiz) {
        flashcards.removeTaxa(state.sharedQuiz.removedTaxonIds);
      }
      return { ...state, flashcards };
    }
    case 'SHARED_QUIZ_OPENED': {
      return {
        ...state,
        selectedPlace: action.place,
        taxaScope: action.quiz.taxaScope,
        speciesFilters: action.quiz.filters,
        commonNameOverrides: action.quiz.commonNameOverrides,
      };
    }
    case 'COMMON_NAME_EDITED': {
      const commonNameOverrides = { ...state.commonNameOverrides };
      // Clearing the box restores whatever iNaturalist calls the taxon.
      if (action.commonName.trim() === '') {
        delete commonNameOverrides[action.taxonId];
      } else {
        commonNameOverrides[action.taxonId] = action.commonName;
      }
      return { ...state, commonNameOverrides };
    }
    case 'QUIZ_LINK_COPIED': {
      return { ...state, flashcardNotice: 'Quiz link copied to the clipboard.' };
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
      const restoredTaxa = state.flashcards.raiseCurrentFlashcardRank();
      return {
        ...state,
        flashcardRevealed: false,
        flashcardNotice: describeRestoredFlashcards(
          restoredTaxa.map((taxon) => displayNameOf(taxon, state.commonNameOverrides)),
          higherRankTaxon,
        ),
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
