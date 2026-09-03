import { IconicTaxa, Place, SpeciesCount, SpeciesFilters, Taxon } from './inaturalist';
import { FlashcardRating } from './flashcard-rating';
import { FlashcardImage } from './flashcard-data';
import { TaxaScope } from './taxa-scope';

export type Action =
  | { type: 'PLACE_SELECTED'; place: Place }
  | {
      type: 'INATURALIST_URL_APPLIED';
      place: Place;
      iconicTaxon?: IconicTaxa;
      filters: SpeciesFilters;
    }
  | { type: 'TAXA_SCOPE_SELECTED'; taxaScope: TaxaScope }
  | { type: 'ALL_SPECIES_LOADED'; allSpecies: SpeciesCount[] }
  | { type: 'REVEAL_FLASHCARD' }
  | { type: 'REMOVE_FLASHCARD' }
  | { type: 'RAISE_FLASHCARD_RANK' }
  | { type: 'DISMISS_FLASHCARD_NOTICE' }
  | { type: 'FLASHCARD_IMAGE_METADATA_LOADED'; images: FlashcardImage[] }
  | { type: 'FLASHCARD_ANCESTORS_LOADED'; ancestors: Taxon[] }
  | { type: 'SCORE_FLASHCARD'; flashcardRating: FlashcardRating };
