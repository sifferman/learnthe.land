import { Taxon } from './inaturalist';
import { CommonNameOverrides } from './quiz-link';

// The name a flashcard is tested on: whatever the quizzer renamed it to, or
// else the name iNaturalist prefers, or else nothing but the scientific name.
export const commonNameOf = (taxon: Taxon, overrides: CommonNameOverrides) =>
  overrides[taxon.id] ?? taxon.preferred_common_name;

export const displayNameOf = (taxon: Taxon, overrides: CommonNameOverrides) =>
  commonNameOf(taxon, overrides) ?? taxon.name;
