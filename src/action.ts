import { IconicTaxa, Place, SpeciesCount, SpeciesFilters, Taxon } from './inaturalist';
import { FlashcardRating } from './flashcard-rating';
import { FlashcardImage } from './flashcard-data';
import { TaxaScope } from './taxa-scope';
import { SharedQuiz } from './quiz-link';

export type Action =
  | { type: 'PLACE_SELECTED'; place: Place }
  | {
      type: 'INATURALIST_URL_APPLIED';
      place: Place;
      iconicTaxon?: IconicTaxa;
      filters: SpeciesFilters;
    }
  | { type: 'TAXA_SCOPE_SELECTED'; taxaScope: TaxaScope }
  | { type: 'ALL_SPECIES_LOADED'; allSpecies: SpeciesCount[]; raisedTaxa: Taxon[] }
  | { type: 'SHARED_QUIZ_OPENED'; quiz: SharedQuiz; place: Place }
  | { type: 'COMMON_NAME_EDITED'; taxonId: number; commonName: string }
  | { type: 'QUIZ_LINK_COPIED' }
  | { type: 'REVEAL_FLASHCARD' }
  | { type: 'REMOVE_FLASHCARD' }
  | { type: 'RAISE_FLASHCARD_RANK' }
  | { type: 'DISMISS_FLASHCARD_NOTICE' }
  | { type: 'FLASHCARD_IMAGE_METADATA_LOADED'; images: FlashcardImage[] }
  | { type: 'FLASHCARD_ANCESTORS_LOADED'; ancestors: Taxon[] }
  | { type: 'SCORE_FLASHCARD'; flashcardRating: FlashcardRating };
