import {
  IconicTaxa,
  iconicTaxa,
  iconicTaxaDescription,
  Place,
  SpeciesFilters,
} from '../inaturalist';
import * as React from 'react';
import { SelectionGrid, SelectionGridItem } from './SelectionGrid';
import { HyperlinkButton } from './HyperlinkButton';
import { inaturalistObservationsUrl } from '../inaturalist-url';
import { TaxaScope } from '../taxa-scope';

export const SelectTaxaCategoryStep = ({
  place,
  filters,
  filtersFromPastedUrl,
  onSelect,
}: {
  place: Place;
  filters: SpeciesFilters;
  filtersFromPastedUrl: boolean;
  onSelect: (taxaScope: TaxaScope) => void;
}) => {
  const openInInaturalist = (iconicTaxon?: IconicTaxa) => (
    <HyperlinkButton href={inaturalistObservationsUrl(place, filters, iconicTaxon)}>
      Open in iNat
    </HyperlinkButton>
  );

  // Taking the taxa as they came keeps a pasted search whole, and in the
  // ordinary flow it is everything the place has.
  const everything = (
    <SelectionGridItem
      header={filtersFromPastedUrl ? 'Everything the pasted link covers' : 'All species'}
      onSelect={() => onSelect({ kind: 'allTaxa' })}
      secondaryAction={openInInaturalist()}
      key="allTaxa"
    ></SelectionGridItem>
  );

  const categories = iconicTaxa.map((iconicTaxon) => {
    const header = iconicTaxaDescription[iconicTaxon]
      ? `${iconicTaxon} (${iconicTaxaDescription[iconicTaxon]})`
      : iconicTaxon;
    return (
      <SelectionGridItem
        header={header}
        onSelect={() => onSelect({ kind: 'iconicTaxon', iconicTaxon })}
        secondaryAction={openInInaturalist(iconicTaxon)}
        key={iconicTaxon}
      ></SelectionGridItem>
    );
  });

  return <SelectionGrid>{[everything, ...categories]}</SelectionGrid>;
};
