import * as React from 'react';
import { iNaturalistApi, Place, SpeciesCount, SpeciesFilters, Taxon } from '../inaturalist';
import { iconicTaxonOf, TaxaScope } from '../taxa-scope';
import { fakeSpecies } from '../inaturalist-fake-data';

export const LoadAllSpeciesStep = ({
  offlineMode,
  place,
  taxaScope,
  filters,
  raisedTaxonIds,
  onLoad,
}: {
  offlineMode: boolean;
  place: Place;
  taxaScope: TaxaScope;
  filters: SpeciesFilters;
  // Taxa a shared quiz is testing in place of everything they contain.
  raisedTaxonIds: number[];
  onLoad: (species: SpeciesCount[], raisedTaxa: Taxon[]) => void;
}) => {
  if (offlineMode) {
    window.setTimeout(() => onLoad([fakeSpecies], []), 300);
    return loading;
  }
  Promise.all([
    iNaturalistApi.fetchAllSpeciesForPlace(iconicTaxonOf(taxaScope), place, filters),
    iNaturalistApi.fetchTaxa(raisedTaxonIds),
  ]).then(([species, raisedTaxa]) => onLoad(species, raisedTaxa));
  return loading;
};

const loading = <p>Loading species...</p>;
