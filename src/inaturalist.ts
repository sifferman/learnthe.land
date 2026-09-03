import { GeoJsonObject } from 'geojson';
import { Location } from './location';

/** How many suggestions to ask the place autocomplete endpoint for. */
const placeSearchResultLimit = 9;

export const iNaturalistApi = {
  apiV1Fetch: async <T>(urlPath: string, signal?: AbortSignal): Promise<T> => {
    const url = 'https://api.inaturalist.org' + urlPath;
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`iNaturalist request failed (${response.status}): ${urlPath}`);
    }
    const json = await response.json();
    return json.results as T;
  },

  fetchPlaces: async (location: Location) => {
    return iNaturalistApi.apiV1Fetch<Nearby>(
      '/v1/places/nearby' +
        `?nelat=${location.latitude}` +
        `&nelng=${location.longitude}` +
        `&swlat=${location.latitude}` +
        `&swlng=${location.longitude}`,
    );
  },

  // Matches places by name, for searching somewhere other than where the user is.
  // Pass an `AbortSignal` to drop a request whose query is already out of date.
  fetchPlacesAutocomplete: async (query: string, signal?: AbortSignal) => {
    return iNaturalistApi.apiV1Fetch<Place[]>(
      '/v1/places/autocomplete' +
        `?q=${encodeURIComponent(query)}` +
        `&per_page=${placeSearchResultLimit}`,
      signal,
    );
  },

  // Looks a place up by the id iNaturalist uses in its own URLs.
  fetchPlace: async (placeId: number) => {
    const places = await iNaturalistApi.apiV1Fetch<Place[]>(`/v1/places/${placeId}`);
    return places[0];
  },

  // TODO: limit observations to above a certain count? so we get more common species
  fetchAllSpeciesForPlace: async (
    iconicTaxon: IconicTaxa | undefined,
    place: Place,
    filters: SpeciesFilters = {},
  ) => {
    return iNaturalistApi.apiV1Fetch<SpeciesCount[]>(
      '/v1/observations/species_counts' +
        queryString({
          ...(place.searchArea ?? { place_id: place.id }),
          iconic_taxa: iconicTaxon,
          ...filters,
        }),
    );
  },

  fetchObservationsForTaxon: async (taxonId: number) => {
    return iNaturalistApi.apiV1Fetch<Observation[]>(
      '/v1/observations' +
        '?photos=true' +
        // "&popular=true" +
        '&quality_grade=research' +
        `&taxon_id=${taxonId}` +
        '&identifications=most_agree' +
        '&per_page=10',
      // '&order_by=votes';
    );
  },

  fetchAncestorTaxa: async (taxon: Taxon) => {
    const taxonIds = taxon.ancestor_ids;

    // Don't include the species in the results, which is the last entry
    taxonIds.pop();

    // Don't include 'Life' in the results, which is the first entry
    taxonIds.shift();

    return iNaturalistApi.apiV1Fetch<Taxon[]>(`/v1/taxa/${taxonIds.join(',')}`);
  },
};

// A map rectangle, in the corner-per-parameter shape iNaturalist URLs use.
export interface BoundingBox {
  swlat: number;
  swlng: number;
  nelat: number;
  nelng: number;
}

// A circle in kilometers around a point, iNaturalist's other way of naming an area.
export interface SearchCircle {
  lat: number;
  lng: number;
  radius: number;
}

// Set by this app rather than iNaturalist: how to search a place that has no
// iNaturalist place id of its own.
export type SearchArea = BoundingBox | SearchCircle;

// Ranks coarser than a species have a higher rank level than this.
export const speciesRankLevel = 10;

export const qualityGrades = ['research', 'needs_id', 'casual'] as const;

export type QualityGrade = (typeof qualityGrades)[number];

export const booleanFilterNames = [
  'introduced',
  'native',
  'endemic',
  'threatened',
  'captive',
  'photos',
  'sounds',
  'popular',
] as const;

export type BooleanFilterName = (typeof booleanFilterNames)[number];

export const booleanFilterDescriptions: Record<
  BooleanFilterName,
  { whenTrue: string; whenFalse: string }
> = {
  introduced: { whenTrue: 'Introduced species only', whenFalse: 'No introduced species' },
  native: { whenTrue: 'Native species only', whenFalse: 'No native species' },
  endemic: { whenTrue: 'Endemic species only', whenFalse: 'No endemic species' },
  threatened: { whenTrue: 'Threatened species only', whenFalse: 'No threatened species' },
  captive: { whenTrue: 'Captive or cultivated only', whenFalse: 'Nothing captive or cultivated' },
  photos: { whenTrue: 'Observations with photos', whenFalse: 'Observations without photos' },
  sounds: { whenTrue: 'Observations with sounds', whenFalse: 'Observations without sounds' },
  popular: { whenTrue: 'Faved observations', whenFalse: 'Observations nobody faved' },
};

// Restrictions on the species to learn, named the way iNaturalist names its own
// observation-search parameters so that they can be forwarded verbatim.
export type SpeciesFilters = {
  month?: number[];
  taxon_id?: number;
  quality_grade?: QualityGrade;
} & Partial<Record<BooleanFilterName, boolean>>;

const queryString = (params: object) => {
  const pairs = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `${name}=${encodeQueryValue(value)}`);
  return `?${pairs.join('&')}`;
};

// A list-valued parameter goes to iNaturalist as a comma-separated string.
const encodeQueryValue = (value: unknown) =>
  (Array.isArray(value) ? value : [value])
    .map((entry) => encodeURIComponent(String(entry)))
    .join(',');

export interface Nearby {
  standard: Place[];
  community: unknown;
}

export interface Place {
  admin_level: number;
  ancestor_place_ids: null;
  bbox_area: number;
  bounding_box_geojson: { coordinates: unknown[] };
  // Set by this app, not by iNaturalist: present when the place is a stand-in
  // for a pasted map area rather than a place iNaturalist has an id for.
  searchArea?: SearchArea;
  display_name: string;
  geometry_geojson?: GeoJsonObject;
  id: number;
  location: string;
  name: string;
  place_type: number;
  slug: string;
  uuid: string;
}

export interface SpeciesCount {
  count: number;
  taxon: Taxon;
}

export interface Taxon {
  id: number;
  iconic_taxon_id: number;
  iconic_taxon_name: IconicTaxa;
  is_active: boolean;
  name: string;
  preferred_common_name?: string;
  rank: string;
  rank_level: number;
  colors: unknown;
  conservation_status: unknown;
  conservation_statuses: unknown;
  default_photo: {
    id: number;
    attribution: string;
    license_code: string;
    url: string;
    medium_url: string;
    square_url: string;
  };
  establishment_means: unknown;
  observations_count: number;
  preferred_establishment_means: string;
  wikipedia_url?: string;
  ancestor_ids: number[];
}

export interface Observation {
  photos: Photo[];
}

export interface Photo {
  id: number;
  license_code: string;
  url: string;
  attribution: string;
  original_dimensions: {
    width: number;
    height: number;
  };
}

export const iconicTaxa = [
  'Actinopterygii',
  'Animalia',
  'Amphibia',
  'Arachnida',
  'Aves',
  'Chromista',
  'Fungi',
  'Insecta',
  'Mammalia',
  'Mollusca',
  'Reptilia',
  'Plantae',
  'Protozoa',
] as const;

export type IconicTaxa = (typeof iconicTaxa)[number];

export const iconicTaxaDescription: Record<IconicTaxa, string | null> = {
  Actinopterygii: 'Ray-Finned Fishes',
  Animalia: 'Animals not in another category',
  Amphibia: 'Amphibians',
  Arachnida: 'Arachnids',
  Aves: 'Birds',
  Chromista: null,
  Fungi: 'including Lichens',
  Insecta: 'Insects',
  Mammalia: 'Mammals',
  Mollusca: 'Mollusks',
  Reptilia: 'Reptiles',
  Plantae: 'Plants',
  Protozoa: null,
};
