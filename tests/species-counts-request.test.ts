import { iNaturalistApi } from '../src/inaturalist';
import { parseInaturalistSearchUrl } from '../src/inaturalist-url';
import { resolvePlaceFromSearchUrl } from '../src/inaturalist-url';
import { iconicTaxonOf, taxaScopeFor } from '../src/taxa-scope';
import { defaultSpeciesFilters } from '../src/state';
import { fakePlace } from '../src/inaturalist-fake-data';

const requestedUrl = async (request: () => Promise<unknown>) => {
  const fetchedUrls: string[] = [];
  globalThis.fetch = ((url: string) => {
    fetchedUrls.push(url);
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) });
  }) as unknown as typeof globalThis.fetch;
  await request();
  return fetchedUrls[0];
};

const animaliaUrl =
  'https://www.inaturalist.org/observations?month=8,9,10&nelat=37.988660981' +
  '&nelng=-119.301671338&subview=map&swlat=37.860625769&swlng=-119.480670108' +
  '&taxon_id=1&view=species';

// The whole promise of pasting a URL is that the flashcards cover what the URL
// covers, so nothing may be added to it, defaults included.
it('asks iNaturalist for exactly what a pasted URL asked for', async () => {
  const parsed = parseInaturalistSearchUrl(animaliaUrl);
  if (!parsed.ok) {
    throw new Error(parsed.reason);
  }
  const place = await resolvePlaceFromSearchUrl(parsed.value, true);
  const taxaScope = taxaScopeFor(parsed.value.iconicTaxon);

  const url = await requestedUrl(() =>
    iNaturalistApi.fetchAllSpeciesForPlace(iconicTaxonOf(taxaScope), place, parsed.value.filters),
  );

  expect(url).toBe(
    'https://api.inaturalist.org/v1/observations/species_counts' +
      '?swlat=37.860625769&swlng=-119.480670108&nelat=37.988660981&nelng=-119.301671338' +
      '&taxon_id=1&month=8,9,10',
  );
});

// `iconic_taxa=Animalia` matches only the animals iNaturalist puts in no other
// iconic group, which is a handful of species rather than the kingdom.
it('turns a pasted iconic category into the taxon it stands for', async () => {
  const parsed = parseInaturalistSearchUrl(`${animaliaUrl}&iconic_taxa=Animalia`);
  if (!parsed.ok) {
    throw new Error(parsed.reason);
  }

  const url = await requestedUrl(() =>
    iNaturalistApi.fetchAllSpeciesForPlace(iconicTaxonOf(taxaScopeFor('Animalia')), fakePlace, {}),
  );

  expect(url).toContain('taxon_id=1');
  expect(url).not.toContain('iconic_taxa');
  // The pasted `taxon_id` wins, so the two can never disagree in one request.
  expect(parsed.value.iconicTaxon).toBeUndefined();
  expect(parsed.value.filters.taxon_id).toBe(1);
});

it('keeps asking for wild, identified observations when nothing was pasted', async () => {
  const url = await requestedUrl(() =>
    iNaturalistApi.fetchAllSpeciesForPlace('Aves', fakePlace, defaultSpeciesFilters),
  );

  expect(url).toBe(
    'https://api.inaturalist.org/v1/observations/species_counts' +
      `?place_id=${fakePlace.id}&taxon_id=3&captive=false&quality_grade=research`,
  );
});
