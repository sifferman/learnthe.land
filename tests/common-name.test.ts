import { commonNameOf, displayNameOf } from '../src/common-name';
import { fakeSpecies } from '../src/inaturalist-fake-data';

const taxon = fakeSpecies.taxon;

it('tests the name the quizzer gave a taxon over the one iNaturalist prefers', () => {
  expect(commonNameOf(taxon, { [taxon.id]: 'Sky puppy' })).toBe('Sky puppy');
  expect(commonNameOf(taxon, {})).toBe(taxon.preferred_common_name);
});

it('falls back to the scientific name when a taxon has no common name', () => {
  expect(displayNameOf({ ...taxon, preferred_common_name: undefined }, {})).toBe(taxon.name);
});
