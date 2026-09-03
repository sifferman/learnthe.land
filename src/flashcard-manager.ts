import { FlashcardData } from './flashcard-data';
import { FlashcardRating } from './flashcard-rating';
import { SpeciesCount, Taxon } from './inaturalist';

// TODO: make a step for this
const initialFlashcardCount = 5;

export class FlashcardManager {
  inRotation: FlashcardData[];
  notInRotation: FlashcardData[];
  removed: FlashcardData[];
  current: FlashcardData;

  constructor(allSpecies: SpeciesCount[]) {
    // TODO: shuffle the initial flashcards in rotation
    const { inRotation, notInRotation } = fetchInitialFlashcards(allSpecies);
    this.inRotation = inRotation;
    this.notInRotation = notInRotation;
    this.removed = [];
    this.current = popRandom(inRotation);
  }

  get remainingFlashcardCount() {
    return this.inRotation.length + this.notInRotation.length;
  }

  // The taxon of the current flashcard is set aside for the rest of the session.
  removeCurrentFlashcard() {
    this.removed.push(this.current);
    this.loadNextFlashcard();
  }

  /**
   * Replaces the current flashcard with one for the taxon that contains it, so a
   * species becomes its genus and a genus becomes its family. Every flashcard
   * the new one now covers is folded into it, and the names of the covered
   * flashcards that had been removed are returned so they can be reported.
   */
  raiseCurrentFlashcardRank(): string[] {
    const higherRankTaxon = higherRankTaxonOf(this.current);
    if (!higherRankTaxon) {
      return [];
    }

    const covered = (flashcard: FlashcardData) => coversTaxon(higherRankTaxon, flashcard);
    const restoredNames = this.removed.filter(covered).map(flashcardName);

    this.removed = this.removed.filter((flashcard) => !covered(flashcard));
    this.inRotation = this.inRotation.filter((flashcard) => !covered(flashcard));
    this.notInRotation = this.notInRotation.filter((flashcard) => !covered(flashcard));
    this.current = {
      species: { count: higherRankTaxon.observations_count, taxon: higherRankTaxon },
      streak: 0,
      attempts: 0,
      images: [],
      ancestors: this.current.ancestors?.slice(0, -1),
    };

    return restoredNames;
  }

  // TODO: explain the magic numbers in this function
  processScoredFlashcard(flashcard: FlashcardData, latestFlashcardRating: FlashcardRating) {
    if (latestFlashcardRating === 'dontknow') {
      flashcard.streak = 0;
    } else {
      console.assert(latestFlashcardRating === 'know');
      flashcard.streak += 1;
    }

    flashcard.attempts += 1;

    // TODO: introduce randomness

    // Insert the rated card somewhere else
    const lowestStreak = Math.min(...this.inRotation.map((flashcard) => flashcard.streak));
    const indexToInsert =
      this.inRotation.length -
      this.inRotation
        .slice()
        .reverse()
        .findIndex((flashcard) => flashcard.streak === lowestStreak) +
      2 ** flashcard.streak;
    this.inRotation.splice(indexToInsert, 0, flashcard);

    if (shouldAddNewFlashcard(this.inRotation, this.notInRotation)) {
      addNewFlashcard(this.inRotation, this.notInRotation);
    }

    console.debug('New flashcards state', this.inRotation);
  }

  loadNextFlashcard() {
    // Removing flashcards can empty the rotation before its turn to grow.
    if (this.inRotation.length === 0 && this.notInRotation.length > 0) {
      addNewFlashcard(this.inRotation, this.notInRotation);
    }
    this.current = popFirst(this.inRotation);
  }
}

// The taxon one rank up from a flashcard, which is the last of its ancestors.
export const higherRankTaxonOf = ({ ancestors }: FlashcardData): Taxon | undefined =>
  ancestors?.[ancestors.length - 1];

export const describeRestoredFlashcards = (restoredNames: string[], higherRankTaxon: Taxon) => {
  if (restoredNames.length === 0) {
    return undefined;
  }
  return (
    `${joinNames(restoredNames)} ${restoredNames.length === 1 ? 'is' : 'are'} back in play ` +
    `as part of ${higherRankTaxon.name}.`
  );
};

const joinNames = (names: string[]) =>
  names.length <= 2
    ? names.join(' and ')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

const flashcardName = ({ species }: FlashcardData) =>
  species.taxon.preferred_common_name ?? species.taxon.name;

const coversTaxon = (higherRankTaxon: Taxon, { species }: FlashcardData) =>
  species.taxon.id === higherRankTaxon.id ||
  species.taxon.ancestor_ids.includes(higherRankTaxon.id);

const addNewFlashcard = (
  flashcardsInRotation: FlashcardData[],
  flashcardsNotInRotation: FlashcardData[],
): void => {
  const minAttempts = Math.min(...flashcardsInRotation.map((flashcard) => flashcard.attempts));
  const indexToInsert =
    flashcardsInRotation.slice().findIndex((flashcard) => flashcard.attempts === minAttempts) + 1; // If we didn’t add one here, and if the user continues to press "Know", then they would only see new cards instead of cycling in old ones.
  const newFlashcard = flashcardsNotInRotation.splice(0, 1)[0]; // TODO: what to do about these indexings?
  console.assert(newFlashcard !== undefined);

  flashcardsInRotation.splice(indexToInsert, 0, newFlashcard);
};

const shouldAddNewFlashcard = (
  flashcardsInRotation: FlashcardData[],
  flashcardsNotInRotation: FlashcardData[],
): boolean => {
  return (
    // A place with fewer species than `initialFlashcardCount` leaves nothing
    // waiting to be added, and adding from an empty list corrupts the rotation.
    flashcardsNotInRotation.length > 0 &&
    allFlashcardsHaveBeenAttempted(flashcardsInRotation) &&
    doesntKnowFewerThanFiveFlashcards(flashcardsInRotation)
  );
};

const allFlashcardsHaveBeenAttempted = (flashcardsInRotation: FlashcardData[]): boolean => {
  return flashcardsInRotation.filter((flashcard) => flashcard.attempts === 0).length === 0;
};

const doesntKnowFewerThanFiveFlashcards = (flashcardsInRotation: FlashcardData[]): boolean => {
  const numFlashcardsUserDoesntKnow = flashcardsInRotation.filter(
    (flashcard) => flashcard.streak === 0,
  ).length;
  return numFlashcardsUserDoesntKnow < 5;
};

const fetchInitialFlashcards = (
  allSpecies: SpeciesCount[],
): { inRotation: FlashcardData[]; notInRotation: FlashcardData[] } => {
  const inRotation = allSpecies.slice(0, initialFlashcardCount).map((species) => {
    return { species, streak: 0, attempts: 0, images: [], ancestors: undefined };
  });
  const notInRotation = allSpecies.slice(initialFlashcardCount).map((species) => {
    return { species, streak: 0, attempts: 0, images: [], ancestors: undefined };
  });
  return { inRotation, notInRotation };
};

const popFirst = <T>(items: T[]) => {
  return items.splice(0, 1)[0];
};

const popRandom = <T>(items: T[]) => {
  const randIndex = Math.floor(Math.random() * items.length);
  return items.splice(randIndex, 1)[0];
};
