import { describeInaturalistSearchUrl, parseInaturalistSearchUrl } from '../src/inaturalist-url';

const bboxUrl =
  'https://www.inaturalist.org/observations?introduced=true&month=8,9,10' +
  '&nelat=37.988660981&nelng=-119.301671338&subview=map&swlat=37.860625769' +
  '&swlng=-119.480670108&view=species&iconic_taxa=Actinopterygii';

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
    boundingBox: {
      swlat: 37.860625769,
      swlng: -119.480670108,
      nelat: 37.988660981,
      nelng: -119.301671338,
    },
    iconicTaxon: 'Actinopterygii',
    filters: { monthsOfTheYear: [8, 9, 10], introduced: true },
  });
});

it('prefers a place id over a bounding box', () => {
  const parsed = unwrap(
    'https://www.inaturalist.org/observations?place_id=1723&nelat=1&nelng=2&swlat=3&swlng=4',
  );
  expect(parsed.placeId).toBe(1723);
  expect(parsed.boundingBox).toBeUndefined();
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
