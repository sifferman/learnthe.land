import * as React from 'react';
import { IconicTaxa, iNaturalistApi, Place, SpeciesCount, SpeciesFilters } from '../inaturalist';
import { fakeSpecies } from '../inaturalist-fake-data';

export const LoadAllSpeciesStep = ({
  offlineMode,
  place,
  taxaCategory,
  filters,
  onLoad,
}: {
  offlineMode: boolean;
  place: Place;
  taxaCategory: IconicTaxa;
  filters: SpeciesFilters;
  onLoad: (species: SpeciesCount[]) => void;
}) => {
  if (offlineMode) {
    window.setTimeout(() => onLoad([fakeSpecies]), 300);
    return loading;
  }
  iNaturalistApi.fetchAllSpeciesForPlace(taxaCategory, place, filters).then(onLoad);
  return loading;
};

const loading = <p>Loading species...</p>;
