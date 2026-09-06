import * as React from 'react';
import { useReducer } from 'react';
import { SelectPlaceStep } from './SelectPlaceStep';
import { SelectTaxaCategoryStep } from './SelectTaxaCategoryStep';
import { LoadAllSpeciesStep } from './LoadAllSpeciesStep';
import { Flashcard } from './Flashcard';
import { initialState } from '../state';
import { RestoreSharedQuizStep } from './RestoreSharedQuizStep';
import { buildQuizLink, parseQuizLink } from '../quiz-link';
import { reducer } from '../reducer';

// const reactLogo = require("./../assets/img/react_logo.svg");
import './../assets/css/App.css';
// import '@egjs/flicking/dist/flicking.css'; // FIXME: Why doesn't this import the CSS?
import 'leaflet/dist/leaflet.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { TopNavbars } from './TopNavbars';
import { Container } from 'react-bootstrap';

const OFFLINE_MODE = false;

// A quiz shared as a link arrives in the address bar, so it is read once and
// then replayed through the ordinary steps.
const sharedQuiz = parseQuizLink(window.location.href);

const App = () => {
  const [state, dispatch] = useReducer(reducer, { ...initialState, sharedQuiz });

  let inner: React.JSX.Element;

  if (sharedQuiz && !state.selectedPlace) {
    inner = (
      <Container className="py-3">
        <RestoreSharedQuizStep
          offlineMode={OFFLINE_MODE}
          quiz={sharedQuiz}
          onResolvePlace={(place) =>
            dispatch({ type: 'SHARED_QUIZ_OPENED', quiz: sharedQuiz, place })
          }
        />
      </Container>
    );
  } else if (!state.selectedPlace) {
    inner = (
      <Container className="py-3">
        <SelectPlaceStep
          offlineMode={OFFLINE_MODE}
          onSelectPlace={(place) => dispatch({ type: 'PLACE_SELECTED', place })}
          onApplyInaturalistUrl={(place, iconicTaxon, filters) =>
            dispatch({ type: 'INATURALIST_URL_APPLIED', place, iconicTaxon, filters })
          }
        />
      </Container>
    );
  } else if (!state.taxaScope) {
    inner = (
      <Container className="py-3">
        <SelectTaxaCategoryStep
          place={state.selectedPlace}
          filters={state.speciesFilters}
          filtersFromPastedUrl={state.filtersFromPastedUrl}
          onSelect={(taxaScope) => dispatch({ type: 'TAXA_SCOPE_SELECTED', taxaScope })}
        />
      </Container>
    );
  } else if (!state.flashcards) {
    inner = (
      <Container className="py-3">
        <LoadAllSpeciesStep
          offlineMode={OFFLINE_MODE}
          place={state.selectedPlace}
          taxaScope={state.taxaScope}
          filters={state.speciesFilters}
          raisedTaxonIds={state.sharedQuiz?.raisedTaxonIds ?? []}
          onLoad={(allSpecies, raisedTaxa) =>
            dispatch({ type: 'ALL_SPECIES_LOADED', allSpecies, raisedTaxa })
          }
        />
      </Container>
    );
  } else {
    const { selectedPlace, taxaScope, speciesFilters, commonNameOverrides, flashcards } = state;
    inner = (
      <Flashcard
        offlineMode={OFFLINE_MODE}
        revealed={state.flashcardRevealed}
        data={state.flashcards.current}
        place={state.selectedPlace}
        filters={state.speciesFilters}
        notice={state.flashcardNotice}
        removeDisabled={state.flashcards.remainingFlashcardCount === 0}
        onReveal={() => dispatch({ type: 'REVEAL_FLASHCARD' })}
        onRemove={() => dispatch({ type: 'REMOVE_FLASHCARD' })}
        onRaiseRank={() => dispatch({ type: 'RAISE_FLASHCARD_RANK' })}
        commonNameOverrides={state.commonNameOverrides}
        onEditCommonName={(taxonId, commonName) =>
          dispatch({ type: 'COMMON_NAME_EDITED', taxonId, commonName })
        }
        onShareQuiz={() => {
          navigator.clipboard.writeText(
            buildQuizLink({
              appUrl: window.location.origin + window.location.pathname,
              place: selectedPlace,
              taxaScope,
              filters: speciesFilters,
              commonNameOverrides,
              removedTaxonIds: flashcards.removedTaxonIds,
              raisedTaxonIds: flashcards.raisedTaxa.map((taxon) => taxon.id),
            }),
          );
          dispatch({ type: 'QUIZ_LINK_COPIED' });
        }}
        onDismissNotice={() => dispatch({ type: 'DISMISS_FLASHCARD_NOTICE' })}
        onRateClick={(rating) => dispatch({ type: 'SCORE_FLASHCARD', flashcardRating: rating })}
        onLoadImageMetadata={(images) =>
          dispatch({ type: 'FLASHCARD_IMAGE_METADATA_LOADED', images })
        }
        onLoadAncestors={(ancestors) => dispatch({ type: 'FLASHCARD_ANCESTORS_LOADED', ancestors })}
      />
    );
  }

  return (
    <>
      <TopNavbars
        selectedPlace={state.selectedPlace}
        taxaScope={state.taxaScope}
        score={state.score}
      />
      {inner}
    </>
  );
};

export default App;
