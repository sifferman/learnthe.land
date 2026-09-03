import { IconicTaxa } from './inaturalist';

// Which taxa a session draws its flashcards from. A pasted iNaturalist URL that
// names no `iconic_taxa` covers every taxon its search returned, so there is
// nothing left to ask about.
export type TaxaScope = { kind: 'allTaxa' } | { kind: 'iconicTaxon'; iconicTaxon: IconicTaxa };

export const iconicTaxonOf = (taxaScope: TaxaScope): IconicTaxa | undefined =>
  taxaScope.kind === 'iconicTaxon' ? taxaScope.iconicTaxon : undefined;

export const describeTaxaScope = (taxaScope: TaxaScope) =>
  taxaScope.kind === 'iconicTaxon' ? taxaScope.iconicTaxon : 'All species';
