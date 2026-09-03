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
