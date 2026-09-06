import { IconicTaxa, Place, SpeciesFilters } from './inaturalist';
import { InaturalistSearchUrl, parseSearchParams } from './inaturalist-url';
import { TaxaScope } from './taxa-scope';

/**
 * Everything a shared link carries: the search the flashcards are drawn from,
 * plus the changes made to the deck while quizzing, so opening the link starts
 * the same quiz rather than merely the same search.
 */
export type SharedQuiz = InaturalistSearchUrl & {
  taxaScope: TaxaScope;
  commonNameOverrides: CommonNameOverrides;
  removedTaxonIds: number[];
  raisedTaxonIds: number[];
};

// Common names the quizzer renamed, by the taxon id they belong to.
export type CommonNameOverrides = Record<number, string>;

const commonNameParam = 'name';
const removedParam = 'removed';
const raisedParam = 'raised';
const categoryParam = 'iconic_taxa';

export const buildQuizLink = ({
  appUrl,
  place,
  taxaScope,
  filters,
  commonNameOverrides,
  removedTaxonIds,
  raisedTaxonIds,
}: {
  appUrl: string;
  place: Place;
  taxaScope: TaxaScope;
  filters: SpeciesFilters;
  commonNameOverrides: CommonNameOverrides;
  removedTaxonIds: number[];
  raisedTaxonIds: number[];
}) => {
  const params = new URLSearchParams();

  if (place.searchArea) {
    for (const [name, value] of Object.entries(place.searchArea)) {
      params.set(name, String(value));
    }
  } else {
    params.set('place_id', String(place.id));
  }

  if (taxaScope.kind === 'iconicTaxon') {
    params.set(categoryParam, taxaScope.iconicTaxon);
  }

  for (const [name, value] of Object.entries(filters)) {
    if (value !== undefined) {
      params.set(name, String(value));
    }
  }

  // Repeating the parameter keeps names holding commas or colons intact.
  for (const [taxonId, commonName] of Object.entries(commonNameOverrides)) {
    params.append(commonNameParam, `${taxonId}:${commonName}`);
  }

  setIdList(params, removedParam, removedTaxonIds);
  setIdList(params, raisedParam, raisedTaxonIds);

  return `${appUrl}?${params}`;
};

export const parseQuizLink = (href: string): SharedQuiz | undefined => {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return undefined;
  }

  const searched = parseSearchParams(url.searchParams);
  if (searched.placeId === undefined && !searched.searchArea) {
    return undefined;
  }

  return {
    ...searched,
    taxaScope: taxaScopeOf(searched.iconicTaxon, url.searchParams.get(categoryParam)),
    commonNameOverrides: parseCommonNameOverrides(url.searchParams.getAll(commonNameParam)),
    removedTaxonIds: parseIdList(url.searchParams.get(removedParam)),
    raisedTaxonIds: parseIdList(url.searchParams.get(raisedParam)),
  };
};

// A link that names no category covers whatever taxa its search returns, which
// is the choice the category step offers as "everything".
const taxaScopeOf = (iconicTaxon: IconicTaxa | undefined, category: string | null): TaxaScope =>
  iconicTaxon && category ? { kind: 'iconicTaxon', iconicTaxon } : { kind: 'allTaxa' };

const parseCommonNameOverrides = (values: string[]): CommonNameOverrides => {
  const overrides: CommonNameOverrides = {};
  for (const value of values) {
    // Only the first colon separates them, so a renamed name may hold more.
    const separatorIndex = value.indexOf(':');
    const taxonId = Number(value.slice(0, separatorIndex));
    const commonName = value.slice(separatorIndex + 1);
    if (Number.isInteger(taxonId) && commonName !== '') {
      overrides[taxonId] = commonName;
    }
  }
  return overrides;
};

const setIdList = (params: URLSearchParams, name: string, ids: number[]) => {
  if (ids.length > 0) {
    params.set(name, ids.join(','));
  }
};

const parseIdList = (value: string | null): number[] =>
  value
    ? value
        .split(',')
        .map(Number)
        .filter((id) => Number.isInteger(id))
    : [];
