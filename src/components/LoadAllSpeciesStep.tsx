import * as React from 'react';
import { iNaturalistApi, Place, SpeciesCount, SpeciesFilters } from '../inaturalist';
import { iconicTaxonOf, TaxaScope } from '../taxa-scope';
import { fakeSpecies } from '../inaturalist-fake-data';

export const LoadAllSpeciesStep = ({
  offlineMode,
  place,
  taxaScope,
  filters,
  onLoad,
}: {
  offlineMode: boolean;
  place: Place;
  taxaScope: TaxaScope;
  filters: SpeciesFilters;
  onLoad: (species: SpeciesCount[]) => void;
}) => {
  if (offlineMode) {
    window.setTimeout(() => onLoad([fakeSpecies]), 300);
    return loading;
  }
  iNaturalistApi.fetchAllSpeciesForPlace(iconicTaxonOf(taxaScope), place, filters).then(onLoad);
  return loading;
};

const loading = <p>Loading species...</p>;
