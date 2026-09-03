import { Feature } from 'geojson';
import {
  BoundingBox,
  IconicTaxa,
  iconicTaxa,
  iNaturalistApi,
  Place,
  SpeciesFilters,
  establishmentFilterNames,
  establishmentFilterLabels,
} from './inaturalist';
import { fakePlace } from './inaturalist-fake-data';

export type InaturalistSearchUrl = {
  placeId?: number;
  boundingBox?: BoundingBox;
  iconicTaxon?: IconicTaxa;
  filters: SpeciesFilters;
};

export type ParsedInaturalistSearchUrl =
  { ok: true; value: InaturalistSearchUrl } | { ok: false; reason: string };

const abbreviatedMonthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const inaturalistHostnamePattern = /(^|\.)inaturalist\.org$/;

export const parseInaturalistSearchUrl = (enteredUrl: string): ParsedInaturalistSearchUrl => {
  let url: URL;
  try {
    url = new URL(enteredUrl.trim());
  } catch {
    return { ok: false, reason: 'That does not look like a URL.' };
  }

  if (!inaturalistHostnamePattern.test(url.hostname)) {
    return { ok: false, reason: 'That URL is not an iNaturalist URL.' };
  }

  const placeId = parseFirstIntegerInCommaList(url.searchParams.get('place_id'));

  // iNaturalist keeps the current map view in the URL even when a place is
  // chosen, so the place wins and the rectangle is only used on its own.
  const boundingBox = placeId === undefined ? parseBoundingBox(url.searchParams) : undefined;

  if (placeId === undefined && !boundingBox) {
    return {
      ok: false,
      reason:
        'That URL does not include a place or a map area. Zoom to an area or pick a place on iNaturalist first.',
    };
  }

  return {
    ok: true,
    value: {
      placeId,
      boundingBox,
      iconicTaxon: parseFirstSupportedIconicTaxon(url.searchParams.get('iconic_taxa')),
      filters: parseSpeciesFilters(url.searchParams),
    },
  };
};

export const describeInaturalistSearchUrl = ({
  placeId,
  boundingBox,
  iconicTaxon,
  filters,
}: InaturalistSearchUrl): string[] => {
  const descriptions: string[] = [];

  if (placeId !== undefined) {
    descriptions.push(`Place #${placeId}`);
  } else if (boundingBox) {
    descriptions.push(`Map area ${describeBoundingBox(boundingBox)}`);
  }

  if (iconicTaxon) {
    descriptions.push(iconicTaxon);
  }

  if (filters.monthsOfTheYear) {
    const monthDescriptions = filters.monthsOfTheYear.map(
      (month) => abbreviatedMonthNames[month - 1],
    );
    descriptions.push(`Months: ${monthDescriptions.join(', ')}`);
  }

  for (const filterName of establishmentFilterNames) {
    const label = establishmentFilterLabels[filterName];
    if (filters[filterName] === true) {
      descriptions.push(`${label} species only`);
    } else if (filters[filterName] === false) {
      descriptions.push(`No ${label.toLowerCase()} species`);
    }
  }

  return descriptions;
};

export const resolvePlaceFromSearchUrl = async (
  { placeId, boundingBox }: InaturalistSearchUrl,
  offlineMode: boolean,
): Promise<Place> => {
  if (placeId === undefined) {
    if (!boundingBox) {
      throw new Error('Search URL has neither a place nor a map area');
    }
    return createPlaceForBoundingBox(boundingBox);
  }

  if (offlineMode) {
    return fakePlace;
  }

  const place = await iNaturalistApi.fetchPlace(placeId);
  if (!place) {
    throw new Error(`iNaturalist has no place with id ${placeId}`);
  }
  return place;
};

// A place that exists only in this app, standing in for a map rectangle that
// iNaturalist has no place id for.
const createPlaceForBoundingBox = (boundingBox: BoundingBox): Place => {
  const name = `Map area (${describeBoundingBox(boundingBox)})`;

  return {
    admin_level: 0,
    ancestor_place_ids: null,
    bbox_area: 0,
    bounding_box_geojson: { coordinates: [] },
    boundingBox,
    display_name: name,
    geometry_geojson: createGeoJsonFeatureForBoundingBox(boundingBox),
    id: 0,
    location: `${midpoint(boundingBox.swlat, boundingBox.nelat)},${midpoint(
      boundingBox.swlng,
      boundingBox.nelng,
    )}`,
    name,
    place_type: 0,
    slug: 'map-area',
    uuid: '',
  };
};

const createGeoJsonFeatureForBoundingBox = ({
  swlat,
  swlng,
  nelat,
  nelng,
}: BoundingBox): Feature => ({
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [swlng, swlat],
        [nelng, swlat],
        [nelng, nelat],
        [swlng, nelat],
        [swlng, swlat],
      ],
    ],
  },
});

const parseBoundingBox = (searchParams: URLSearchParams): BoundingBox | undefined => {
  const swlat = parseFiniteNumber(searchParams.get('swlat'));
  const swlng = parseFiniteNumber(searchParams.get('swlng'));
  const nelat = parseFiniteNumber(searchParams.get('nelat'));
  const nelng = parseFiniteNumber(searchParams.get('nelng'));

  if (swlat === undefined || swlng === undefined || nelat === undefined || nelng === undefined) {
    return undefined;
  }

  return { swlat, swlng, nelat, nelng };
};

const parseSpeciesFilters = (searchParams: URLSearchParams): SpeciesFilters => {
  const filters: SpeciesFilters = {};

  const monthsOfTheYear = parseMonthNumbers(searchParams.get('month'));
  if (monthsOfTheYear) {
    filters.monthsOfTheYear = monthsOfTheYear;
  }

  for (const filterName of establishmentFilterNames) {
    const value = parseBoolean(searchParams.get(filterName));
    if (value !== undefined) {
      filters[filterName] = value;
    }
  }

  return filters;
};

// A flashcard run covers one category, so the first supported entry of
// iNaturalist's comma-separated list wins.
const parseFirstSupportedIconicTaxon = (value: string | null): IconicTaxa | undefined =>
  splitCommaList(value).find((entry): entry is IconicTaxa =>
    (iconicTaxa as readonly string[]).includes(entry),
  );

const parseMonthNumbers = (value: string | null): number[] | undefined => {
  const months = splitCommaList(value)
    .map(Number)
    .filter((month) => Number.isInteger(month) && month >= 1 && month <= 12);
  return months.length > 0 ? months : undefined;
};

const parseFirstIntegerInCommaList = (value: string | null): number | undefined => {
  const [first] = splitCommaList(value).map(Number);
  return Number.isInteger(first) ? first : undefined;
};

const parseBoolean = (value: string | null): boolean | undefined => {
  if (value === 'true' || value === 'false') {
    return value === 'true';
  }
  return undefined;
};

const parseFiniteNumber = (value: string | null): number | undefined => {
  const parsed = Number(value);
  return value !== null && value !== '' && Number.isFinite(parsed) ? parsed : undefined;
};

const splitCommaList = (value: string | null): string[] =>
  value ? value.split(',').map((entry) => entry.trim()) : [];

const describeBoundingBox = ({ swlat, swlng, nelat, nelng }: BoundingBox) =>
  `${formatCoordinateDegrees(swlat)}, ${formatCoordinateDegrees(swlng)} to ` +
  `${formatCoordinateDegrees(nelat)}, ${formatCoordinateDegrees(nelng)}`;

const formatCoordinateDegrees = (degrees: number) => degrees.toFixed(3);

const midpoint = (from: number, to: number) => (from + to) / 2;
