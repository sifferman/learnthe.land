import { useEffect, useState } from 'react';
import { iNaturalistApi, Place } from './inaturalist';
import { fakePlace } from './inaturalist-fake-data';

/** How long the search box has to sit still before a query is sent. */
const debounceMs = 300;

export type PlaceSearch =
  | { status: 'idle' } // Nothing typed, so there is nothing to search for.
  | { status: 'searching' }
  | { status: 'done'; results: Place[] }
  | { status: 'failed' };

/**
 * Searches iNaturalist for places matching `query`, debounced so that typing a
 * word does not fire a request per keystroke. A query that changes while a
 * request is still in flight aborts it, so results can never arrive out of
 * order and overwrite a newer search.
 */
export const usePlaceSearch = (query: string, offlineMode: boolean): PlaceSearch => {
  const [search, setSearch] = useState<PlaceSearch>({ status: 'idle' });

  // Depending on the trimmed query means adding trailing whitespace to an
  // existing query doesn't re-run the search.
  const trimmedQuery = query.trim();

  useEffect(() => {
    if (trimmedQuery === '') {
      setSearch({ status: 'idle' });
      return;
    }

    setSearch({ status: 'searching' });

    if (offlineMode) {
      const offlineTimer = window.setTimeout(() => {
        const matchesQuery = fakePlace.display_name
          .toLowerCase()
          .includes(trimmedQuery.toLowerCase());
        setSearch({ status: 'done', results: matchesQuery ? [fakePlace] : [] });
      }, debounceMs);
      return () => window.clearTimeout(offlineTimer);
    }

    const abortController = new AbortController();
    const timer = window.setTimeout(() => {
      iNaturalistApi
        .fetchPlacesAutocomplete(trimmedQuery, abortController.signal)
        .then((results) => setSearch({ status: 'done', results }))
        .catch((error) => {
          // An abort just means the query moved on, and a newer search already
          // owns the state.
          if (abortController.signal.aborted) {
            return;
          }
          console.warn('Could not search for places', error);
          setSearch({ status: 'failed' });
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
      abortController.abort();
    };
  }, [trimmedQuery, offlineMode]);

  return search;
};
