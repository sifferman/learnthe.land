import { FlashcardManager } from './flashcard-manager';
import { IconicTaxa, Place, SpeciesFilters } from './inaturalist';

export type State<T = LoadedFlashcards | UnloadedFlashcards> = BaseState & T;

type BaseState = {
  selectedPlace?: Place;
  selectedTaxaCategory?: IconicTaxa;
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

export const initialState: State = {
  selectedPlace: undefined,
  selectedTaxaCategory: undefined,
  speciesFilters: {},
  flashcards: undefined,
  flashcardRevealed: false,
  flashcardNotice: undefined,
  score: 0,
};
