import { buildQuizLink, parseQuizLink } from '../src/quiz-link';
import { fakePlace } from '../src/inaturalist-fake-data';
import { Place } from '../src/inaturalist';

const appUrl = 'https://ethan.sifferman.dev/learnthe.land/';

const quizLink = (place: Place = fakePlace) =>
  buildQuizLink({
    appUrl,
    place,
    taxaScope: { kind: 'iconicTaxon', iconicTaxon: 'Aves' },
    filters: { month: [8, 9, 10], captive: false },
    commonNameOverrides: { 12345: 'Sky puppy, the second: a bird' },
    removedTaxonIds: [7, 8],
    raisedTaxonIds: [48663],
  });

it('carries a whole quiz there and back again', () => {
  const shared = parseQuizLink(quizLink());

  expect(shared).toBeDefined();
  expect(shared?.placeId).toBe(fakePlace.id);
  expect(shared?.taxaScope).toEqual({ kind: 'iconicTaxon', iconicTaxon: 'Aves' });
  expect(shared?.filters.month).toEqual([8, 9, 10]);
  expect(shared?.filters.captive).toBe(false);
  expect(shared?.removedTaxonIds).toEqual([7, 8]);
  expect(shared?.raisedTaxonIds).toEqual([48663]);
});

// A renamed name is the quizzer's own text, so it has to survive punctuation
// that the link format itself uses.
it('keeps a renamed common name exactly as it was typed', () => {
  expect(parseQuizLink(quizLink())?.commonNameOverrides).toEqual({
    12345: 'Sky puppy, the second: a bird',
  });
});

it('carries a map area when the place has no iNaturalist id', () => {
  const mapArea = { swlat: 37.86, swlng: -119.48, nelat: 37.98, nelng: -119.3 };
  const shared = parseQuizLink(quizLink({ ...fakePlace, searchArea: mapArea }));

  expect(shared?.searchArea).toEqual(mapArea);
  expect(shared?.placeId).toBeUndefined();
});

it('is not a quiz link when it names no place', () => {
  expect(parseQuizLink(appUrl)).toBeUndefined();
  expect(parseQuizLink('not a url')).toBeUndefined();
});
