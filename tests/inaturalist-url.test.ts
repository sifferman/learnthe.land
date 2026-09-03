import { describeInaturalistSearchUrl, parseInaturalistSearchUrl } from '../src/inaturalist-url';

const bboxUrl =
  'https://www.inaturalist.org/observations?introduced=true&month=8,9,10' +
  '&nelat=37.988660981&nelng=-119.301671338&subview=map&swlat=37.860625769' +
  '&swlng=-119.480670108&view=species&iconic_taxa=Actinopterygii';

const radiusUrl =
  'https://www.inaturalist.org/observations?captive=false&introduced' +
  '&lat=32.16073642100017&lng=-117.25780963899999&photos&popular&quality_grade=research' +
  '&radius=1898.1988340666671&sounds&subview=map&taxon_id=3&threatened';

const unwrap = (input: string) => {
  const parsed = parseInaturalistSearchUrl(input);
  if (!parsed.ok) {
    throw new Error(`Expected a parseable URL, got: ${parsed.reason}`);
  }
  return parsed.value;
};

it('reads the map area, category and filters out of an observation search URL', () => {
  expect(unwrap(bboxUrl)).toEqual({
    placeId: undefined,
    searchArea: {
      swlat: 37.860625769,
      swlng: -119.480670108,
      nelat: 37.988660981,
      nelng: -119.301671338,
    },
    iconicTaxon: 'Actinopterygii',
    filters: { month: [8, 9, 10], introduced: true },
  });
});

it('reads a radius search, a taxon and valueless parameters', () => {
  expect(unwrap(radiusUrl)).toEqual({
    placeId: undefined,
    searchArea: { lat: 32.16073642100017, lng: -117.25780963899999, radius: 1898.1988340666671 },
    iconicTaxon: undefined,
    filters: {
      taxon_id: 3,
      quality_grade: 'research',
      introduced: true,
      threatened: true,
      photos: true,
      sounds: true,
      popular: true,
      captive: false,
    },
  });
});

it('prefers a place id over a map area', () => {
  const parsed = unwrap(
    'https://www.inaturalist.org/observations?place_id=1723&nelat=1&nelng=2&swlat=3&swlng=4',
  );
  expect(parsed.placeId).toBe(1723);
  expect(parsed.searchArea).toBeUndefined();
});

it('takes the first place id and the first known iconic taxon of a list', () => {
  const parsed = unwrap(
    'https://www.inaturalist.org/observations?place_id=1723,54&iconic_taxa=Chordata,Aves',
  );
  expect(parsed.placeId).toBe(1723);
  expect(parsed.iconicTaxon).toBe('Aves');
});

it('ignores filters it does not understand', () => {
  const parsed = unwrap(
    'https://www.inaturalist.org/observations?place_id=1&subview=map&order_by=votes&month=bogus',
  );
  expect(parsed.filters).toEqual({});
  expect(parsed.iconicTaxon).toBeUndefined();
});

it('prefers a bounding box over a radius', () => {
  const parsed = unwrap(
    'https://www.inaturalist.org/observations?nelat=1&nelng=2&swlat=3&swlng=4&lat=5&lng=6&radius=7',
  );
  expect(parsed.searchArea).toEqual({ nelat: 1, nelng: 2, swlat: 3, swlng: 4 });
});

it('ignores a radius with no point to centre it on', () => {
  expect(parseInaturalistSearchUrl('https://www.inaturalist.org/observations?radius=10').ok).toBe(
    false,
  );
});

it('keeps a filter that was explicitly turned off', () => {
  expect(
    unwrap('https://www.inaturalist.org/observations?place_id=1&native=false').filters,
  ).toEqual({ native: false });
});

it('rejects input that is not an iNaturalist URL', () => {
  expect(parseInaturalistSearchUrl('yosemite').ok).toBe(false);
  expect(parseInaturalistSearchUrl('https://example.com/observations?place_id=1').ok).toBe(false);
});

it('rejects an iNaturalist URL with no place and no map area', () => {
  expect(
    parseInaturalistSearchUrl('https://www.inaturalist.org/observations?iconic_taxa=Aves').ok,
  ).toBe(false);
});

it('summarizes what applying a URL will do', () => {
  expect(describeInaturalistSearchUrl(unwrap(bboxUrl))).toEqual([
    'Map area 37.861, -119.481 to 37.989, -119.302',
    'Actinopterygii',
    'Months: Aug, Sep, Oct',
    'Introduced species only',
  ]);
});

it('summarizes a radius search', () => {
  expect(describeInaturalistSearchUrl(unwrap(radiusUrl))).toEqual([
    'Within 1898.2 km of 32.161, -117.258',
    'Taxon #3',
    'Quality grade: research',
    'Introduced species only',
    'Threatened species only',
    'Nothing captive or cultivated',
    'Observations with photos',
    'Observations with sounds',
    'Faved observations',
  ]);
});
