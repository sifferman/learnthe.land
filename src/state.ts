import { FlashcardManager } from './flashcard-manager';
import { IconicTaxa, Place, SpeciesFilters } from './inaturalist';
import { Location } from './location';

export type State<T = LoadedFlashcards | UnloadedFlashcards> = BaseState & T;

type BaseState = {
  location?: Location;
  places?: Place[];
  selectedPlace?: Place;
  selectedTaxaCategory?: IconicTaxa;
  speciesFilters: SpeciesFilters;
  flashcardRevealed: boolean;
  score: number;
};

export type UnloadedFlashcards = {
  flashcards: undefined;
};

export type LoadedFlashcards = {
  flashcards: FlashcardManager;
};

export const initialState: State = {
  location: undefined,
  places: undefined,
  selectedPlace: undefined,
  selectedTaxaCategory: undefined,
  speciesFilters: {},
  flashcards: undefined,
  flashcardRevealed: false,
  score: 0,
};
