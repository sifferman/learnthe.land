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
    iconicTaxa: IconicTaxa,
    place: Place,
    filters: SpeciesFilters = {},
  ) => {
    return iNaturalistApi.apiV1Fetch<SpeciesCount[]>(
      '/v1/observations/species_counts' +
        '?captive=false' +
        '&quality_grade=research' +
        // A place pasted as a map rectangle has no id to search by, so its
        // bounding box goes to iNaturalist instead.
        (place.boundingBox ? boundingBoxParams(place.boundingBox) : `&place_id=${place.id}`) +
        `&iconic_taxa=${iconicTaxa}` +
        speciesFilterParams(filters),
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

export const establishmentFilterNames = ['introduced', 'native', 'endemic', 'threatened'] as const;

export type EstablishmentFilterName = (typeof establishmentFilterNames)[number];

export const establishmentFilterLabels: Record<EstablishmentFilterName, string> = {
  introduced: 'Introduced',
  native: 'Native',
  endemic: 'Endemic',
  threatened: 'Threatened',
};

// These names match the iNaturalist observation-search parameters they become,
// so a pasted search URL can be replayed here.
export type SpeciesFilters = {
  monthsOfTheYear?: number[];
} & Partial<Record<EstablishmentFilterName, boolean>>;

const boundingBoxParams = ({ swlat, swlng, nelat, nelng }: BoundingBox) =>
  `&swlat=${swlat}&swlng=${swlng}&nelat=${nelat}&nelng=${nelng}`;

const speciesFilterParams = ({ monthsOfTheYear, ...establishmentFilters }: SpeciesFilters) => {
  let params = monthsOfTheYear ? `&month=${monthsOfTheYear.join(',')}` : '';
  for (const [name, value] of Object.entries(establishmentFilters)) {
    if (value !== undefined) {
      params += `&${name}=${value}`;
    }
  }
  return params;
};

export interface Nearby {
  standard: Place[];
  community: unknown;
}

export interface Place {
  admin_level: number;
  ancestor_place_ids: null;
  bbox_area: number;
  bounding_box_geojson: { coordinates: unknown[] };
  /**
   * Set by this app, not by iNaturalist: present when the place is a stand-in
   * for a map rectangle rather than a place iNaturalist has an id for.
   */
  boundingBox?: BoundingBox;
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
  Animalia: 'Animals',
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
