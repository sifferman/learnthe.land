import { FlashcardManager } from './flashcard-manager';
import { Place, SpeciesFilters } from './inaturalist';
import { TaxaScope } from './taxa-scope';

export type State<T = LoadedFlashcards | UnloadedFlashcards> = BaseState & T;

type BaseState = {
  selectedPlace?: Place;
  taxaScope?: TaxaScope;
  // Whether the filters came from a pasted iNaturalist URL rather than the app.
  filtersFromPastedUrl: boolean;
  speciesFilters: SpeciesFilters;
  flashcardRevealed: boolean;
  flashcardNotice?: string;
  score: number;
};

export type UnloadedFlashcards = {
  flashcards: undefined;
};

export type LoadedFlashcards = {
  flashcards: FlashcardManager;
};

// What the app asks iNaturalist for when nobody has pasted a search of their
// own: identified wild observations, which are the ones worth learning from.
export const defaultSpeciesFilters: SpeciesFilters = {
  captive: false,
  quality_grade: 'research',
};

export const initialState: State = {
  selectedPlace: undefined,
  taxaScope: undefined,
  speciesFilters: defaultSpeciesFilters,
  filtersFromPastedUrl: false,
  flashcards: undefined,
  flashcardRevealed: false,
  flashcardNotice: undefined,
  score: 0,
};
