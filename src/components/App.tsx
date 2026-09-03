import * as React from 'react';
import { useReducer } from 'react';
import { SelectPlaceStep } from './SelectPlaceStep';
import { SelectTaxaCategoryStep } from './SelectTaxaCategoryStep';
import { LoadAllSpeciesStep } from './LoadAllSpeciesStep';
import { Flashcard } from './Flashcard';
import { initialState } from '../state';
import { reducer } from '../reducer';

// const reactLogo = require("./../assets/img/react_logo.svg");
import './../assets/css/App.css';
// import '@egjs/flicking/dist/flicking.css'; // FIXME: Why doesn't this import the CSS?
import 'leaflet/dist/leaflet.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { TopNavbars } from './TopNavbars';
import { Container } from 'react-bootstrap';

const OFFLINE_MODE = false;

const App = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  let inner: React.JSX.Element;

  // A pasted URL can name a taxon itself, which leaves nothing to pick here.
  const taxaCategoryStillNeeded =
    !state.selectedTaxaCategory && state.speciesFilters.taxon_id === undefined;

  if (!state.selectedPlace) {
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
  } else if (taxaCategoryStillNeeded) {
    inner = (
      <Container className="py-3">
        <SelectTaxaCategoryStep
          onSelect={(taxaCategory) => dispatch({ type: 'TAXA_CATEGORY_SELECTED', taxaCategory })}
        />
      </Container>
    );
  } else if (!state.flashcards) {
    inner = (
      <Container className="py-3">
        <LoadAllSpeciesStep
          offlineMode={OFFLINE_MODE}
          place={state.selectedPlace}
          taxaCategory={state.selectedTaxaCategory}
          filters={state.speciesFilters}
          onLoad={(allSpecies) => dispatch({ type: 'ALL_SPECIES_LOADED', allSpecies })}
        />
      </Container>
    );
  } else {
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
        selectedTaxaCategory={state.selectedTaxaCategory}
        score={state.score}
      />
      {inner}
    </>
  );
};

export default App;
