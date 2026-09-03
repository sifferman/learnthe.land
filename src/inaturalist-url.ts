import { Feature } from 'geojson';
import {
  booleanFilterDescriptions,
  booleanFilterNames,
  BoundingBox,
  IconicTaxa,
  iconicTaxa,
  iNaturalistApi,
  Place,
  QualityGrade,
  qualityGrades,
  SearchArea,
  SearchCircle,
  SpeciesFilters,
} from './inaturalist';
import { fakePlace } from './inaturalist-fake-data';

export type InaturalistSearchUrl = {
  placeId?: number;
  searchArea?: SearchArea;
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
  // chosen, so the place wins and an area is only used on its own.
  const searchArea = placeId === undefined ? parseSearchArea(url.searchParams) : undefined;

  if (placeId === undefined && !searchArea) {
    return {
      ok: false,
      reason:
        'That URL does not include a place, a map area or a radius. Pick a place or zoom to an area on iNaturalist first.',
    };
  }

  return {
    ok: true,
    value: {
      placeId,
      searchArea,
      // A URL naming a taxon outright has already said which taxa it wants.
      iconicTaxon: url.searchParams.has('taxon_id')
        ? undefined
        : parseFirstSupportedIconicTaxon(url.searchParams.get('iconic_taxa')),
      filters: parseSpeciesFilters(url.searchParams),
    },
  };
};

export const describeInaturalistSearchUrl = ({
  placeId,
  searchArea,
  iconicTaxon,
  filters,
}: InaturalistSearchUrl): string[] => {
  const descriptions: string[] = [];

  if (placeId !== undefined) {
    descriptions.push(`Place #${placeId}`);
  } else if (searchArea) {
    descriptions.push(describeSearchArea(searchArea));
  }

  if (iconicTaxon) {
    descriptions.push(iconicTaxon);
  }

  if (filters.taxon_id !== undefined) {
    descriptions.push(`Taxon #${filters.taxon_id}`);
  }

  if (filters.month) {
    const monthDescriptions = filters.month.map((month) => abbreviatedMonthNames[month - 1]);
    descriptions.push(`Months: ${monthDescriptions.join(', ')}`);
  }

  if (filters.quality_grade) {
    descriptions.push(`Quality grade: ${filters.quality_grade.replace('_', ' ')}`);
  }

  for (const filterName of booleanFilterNames) {
    const filterValue = filters[filterName];
    if (filterValue !== undefined) {
      const { whenTrue, whenFalse } = booleanFilterDescriptions[filterName];
      descriptions.push(filterValue ? whenTrue : whenFalse);
    }
  }

  return descriptions;
};

export const resolvePlaceFromSearchUrl = async (
  { placeId, searchArea }: InaturalistSearchUrl,
  offlineMode: boolean,
): Promise<Place> => {
  if (placeId === undefined) {
    if (!searchArea) {
      throw new Error('Search URL has neither a place nor an area');
    }
    return createPlaceForSearchArea(searchArea);
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

// A place that exists only in this app, standing in for a pasted map area that
// iNaturalist has no place id for.
const createPlaceForSearchArea = (searchArea: SearchArea): Place => {
  const name = describeSearchArea(searchArea);

  return {
    admin_level: 0,
    ancestor_place_ids: null,
    bbox_area: 0,
    bounding_box_geojson: { coordinates: [] },
    searchArea,
    display_name: name,
    geometry_geojson: createGeoJsonFeatureForBoundingBox(boundingBoxAround(searchArea)),
    id: 0,
    location: `${centerOf(searchArea).lat},${centerOf(searchArea).lng}`,
    name,
    place_type: 0,
    slug: 'pasted-map-area',
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

const parseSearchArea = (searchParams: URLSearchParams): SearchArea | undefined =>
  parseBoundingBox(searchParams) ?? parseSearchCircle(searchParams);

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

const parseSearchCircle = (searchParams: URLSearchParams): SearchCircle | undefined => {
  const lat = parseFiniteNumber(searchParams.get('lat'));
  const lng = parseFiniteNumber(searchParams.get('lng'));
  const radius = parseFiniteNumber(searchParams.get('radius'));

  if (lat === undefined || lng === undefined || radius === undefined) {
    return undefined;
  }

  return { lat, lng, radius };
};

const parseSpeciesFilters = (searchParams: URLSearchParams): SpeciesFilters => {
  const filters: SpeciesFilters = {};

  const month = parseMonthNumbers(searchParams.get('month'));
  if (month) {
    filters.month = month;
  }

  const taxonId = parseFirstIntegerInCommaList(searchParams.get('taxon_id'));
  if (taxonId !== undefined) {
    filters.taxon_id = taxonId;
  }

  const qualityGrade = parseQualityGrade(searchParams.get('quality_grade'));
  if (qualityGrade) {
    filters.quality_grade = qualityGrade;
  }

  for (const filterName of booleanFilterNames) {
    const filterValue = parseBoolean(searchParams.get(filterName));
    if (filterValue !== undefined) {
      filters[filterName] = filterValue;
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

const parseQualityGrade = (value: string | null): QualityGrade | undefined =>
  qualityGrades.find((qualityGrade) => qualityGrade === value);

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

// iNaturalist leaves the value off a parameter that is simply on, as in
// `&introduced&threatened`, and spells the opposite out as `&captive=false`.
const parseBoolean = (value: string | null): boolean | undefined => {
  if (value === '' || value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return undefined;
};

const parseFiniteNumber = (value: string | null): number | undefined => {
  const parsed = Number(value);
  return value !== null && value !== '' && Number.isFinite(parsed) ? parsed : undefined;
};

const splitCommaList = (value: string | null): string[] =>
  value ? value.split(',').map((entry) => entry.trim()) : [];

const describeSearchArea = (searchArea: SearchArea) => {
  if (isBoundingBox(searchArea)) {
    const { swlat, swlng, nelat, nelng } = searchArea;
    return (
      `Map area ${formatCoordinateDegrees(swlat)}, ${formatCoordinateDegrees(swlng)} to ` +
      `${formatCoordinateDegrees(nelat)}, ${formatCoordinateDegrees(nelng)}`
    );
  }
  const { lat, lng, radius } = searchArea;
  return (
    `Within ${radius.toFixed(1)} km of ` +
    `${formatCoordinateDegrees(lat)}, ${formatCoordinateDegrees(lng)}`
  );
};

const isBoundingBox = (searchArea: SearchArea): searchArea is BoundingBox => 'swlat' in searchArea;

// The map preview draws a rectangle, so a circle is shown as the square around it.
const boundingBoxAround = (searchArea: SearchArea): BoundingBox => {
  if (isBoundingBox(searchArea)) {
    return searchArea;
  }
  const { lat, lng, radius } = searchArea;
  const latitudeSpan = radius / kilometersPerDegreeOfLatitude;
  const longitudeSpan = latitudeSpan / Math.max(Math.cos(toRadians(lat)), Number.EPSILON);
  return {
    swlat: lat - latitudeSpan,
    swlng: lng - longitudeSpan,
    nelat: lat + latitudeSpan,
    nelng: lng + longitudeSpan,
  };
};

const centerOf = (searchArea: SearchArea) => {
  if (!isBoundingBox(searchArea)) {
    return { lat: searchArea.lat, lng: searchArea.lng };
  }
  return {
    lat: midpoint(searchArea.swlat, searchArea.nelat),
    lng: midpoint(searchArea.swlng, searchArea.nelng),
  };
};

const kilometersPerDegreeOfLatitude = 111.32;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const formatCoordinateDegrees = (degrees: number) => degrees.toFixed(3);

const midpoint = (from: number, to: number) => (from + to) / 2;
