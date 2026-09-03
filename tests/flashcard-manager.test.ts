import { FlashcardManager } from '../src/flashcard-manager';
import { SpeciesCount } from '../src/inaturalist';
import { fakeSpecies } from '../src/inaturalist-fake-data';

const speciesNamed = (name: string): SpeciesCount => ({
  ...fakeSpecies,
  taxon: { ...fakeSpecies.taxon, id: name.length, name, ancestor_ids: [1] },
});

// A place can hold fewer species than a full rotation, which used to leave the
// rotation growing itself from an empty list.
it('keeps its rotation intact when there are fewer species than flashcards', () => {
  const flashcards = new FlashcardManager([speciesNamed('one'), speciesNamed('two')]);

  for (let round = 0; round < 5; round += 1) {
    flashcards.processScoredFlashcard(flashcards.current, 'know');
    flashcards.loadNextFlashcard();
    expect(flashcards.inRotation).not.toContain(undefined);
    expect(flashcards.current).toBeDefined();
  }
});

const taxonAt = (id: number, rank: string, name: string, ancestorIds: number[]) => ({
  ...fakeSpecies.taxon,
  id,
  rank,
  rank_level: rank === 'species' ? 10 : 20,
  name,
  preferred_common_name: undefined,
  ancestor_ids: ancestorIds,
});

const genus = taxonAt(100, 'genus', 'Bufo', [1]);

const speciesInGenus = (id: number, name: string): SpeciesCount => ({
  ...fakeSpecies,
  taxon: taxonAt(id, 'species', name, [1, genus.id, id]),
});

const managerWithLoadedAncestors = (species: SpeciesCount[]) => {
  const flashcards = new FlashcardManager(species);
  for (const flashcard of [flashcards.current, ...flashcards.inRotation]) {
    flashcard.ancestors = [genus];
  }
  return flashcards;
};

it('never offers a removed flashcard again', () => {
  const flashcards = managerWithLoadedAncestors([
    speciesInGenus(11, 'Bufo bufo'),
    speciesInGenus(12, 'Bufo japonicus'),
  ]);
  const removedName = flashcards.current.species.taxon.name;

  flashcards.removeCurrentFlashcard();

  expect(flashcards.current.species.taxon.name).not.toBe(removedName);
  expect(flashcards.inRotation.map((flashcard) => flashcard.species.taxon.name)).not.toContain(
    removedName,
  );
  expect(flashcards.notInRotation.map((flashcard) => flashcard.species.taxon.name)).not.toContain(
    removedName,
  );
});

it('trades a species flashcard for the taxon above it and absorbs its siblings', () => {
  const flashcards = managerWithLoadedAncestors([
    speciesInGenus(11, 'Bufo bufo'),
    speciesInGenus(12, 'Bufo japonicus'),
  ]);

  const restoredNames = flashcards.raiseCurrentFlashcardRank();

  expect(flashcards.current.species.taxon).toEqual(genus);
  expect(flashcards.current.ancestors).toEqual([]);
  expect(flashcards.inRotation).toEqual([]);
  expect(flashcards.notInRotation).toEqual([]);
  expect(restoredNames).toEqual([]);
});

it('reports the removed members that a higher rank brings back', () => {
  const flashcards = managerWithLoadedAncestors([
    speciesInGenus(11, 'Bufo bufo'),
    speciesInGenus(12, 'Bufo japonicus'),
  ]);
  const removedName = flashcards.current.species.taxon.name;
  flashcards.removeCurrentFlashcard();

  expect(flashcards.raiseCurrentFlashcardRank()).toEqual([removedName]);
  expect(flashcards.removed).toEqual([]);
});

it('leaves a flashcard alone when it has no taxon above it', () => {
  const flashcards = managerWithLoadedAncestors([speciesInGenus(11, 'Bufo bufo')]);
  flashcards.current.ancestors = [];

  expect(flashcards.raiseCurrentFlashcardRank()).toEqual([]);
  expect(flashcards.current.species.taxon.name).toBe('Bufo bufo');
});
