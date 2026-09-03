import { IconicTaxa, Place, SpeciesFilters } from '../inaturalist';
import * as React from 'react';
import { useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { GeoAlt } from 'react-bootstrap-icons';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { GeoJsonObject } from 'geojson';
import { SelectionGrid, SelectionGridItem } from './SelectionGrid';
import { Polyline } from 'leaflet';
import { PlaceSearch, usePlaceSearch } from '../use-place-search';
import { NearbyPlaces, useNearbyPlaces } from '../use-nearby-places';
import {
  describeInaturalistSearchUrl,
  parseInaturalistSearchUrl,
  resolvePlaceFromSearchUrl,
} from '../inaturalist-url';

export const SelectPlaceStep = ({
  offlineMode,
  onSelectPlace,
  onApplyInaturalistUrl,
}: {
  offlineMode: boolean;
  onSelectPlace: (place: Place) => void;
  onApplyInaturalistUrl: (
    place: Place,
    iconicTaxon: IconicTaxa | undefined,
    filters: SpeciesFilters,
  ) => void;
}) => {
  const [query, setQuery] = useState('');
  const search = usePlaceSearch(query, offlineMode);
  const { nearbyPlaces, requestNearbyPlaces } = useNearbyPlaces(offlineMode);

  // With an empty search box the nearby places stay on screen, so searching is
  // an alternative to the location-based suggestions rather than a detour.
  const { places: shownPlaces, message } =
    search.status === 'idle'
      ? describeNearbyPlaces(nearbyPlaces)
      : describeSearchedPlaces(search, query);

  const placesElems = shownPlaces.map((place) => {
    const onSelect = () => {
      onSelectPlace(place);
    };
    return (
      // Keying on the place rather than the list index matters once searching
      // can swap the list out: Leaflet maps only set themselves up on mount.
      <SelectionGridItem header={place.display_name} onSelect={onSelect} key={place.id}>
        {place.geometry_geojson && (
          <div style={{ height: '150px', display: 'flex' }}>
            <MapContainer
              attributionControl={false}
              touchZoom={false}
              keyboard={false}
              boxZoom={false}
              doubleClickZoom={false}
              zoomControl={false}
              dragging={false}
              scrollWheelZoom={false}
              center={[0, 0]}
              zoom={5}
              style={{ flexGrow: 1 }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <PlaceLayer geometry={place.geometry_geojson} />
            </MapContainer>
          </div>
        )}
      </SelectionGridItem>
    );
  });

  return (
    <>
      <Form.Group className="mb-3" controlId="place-search">
        <Form.Label>Search for a place</Form.Label>
        <div className="d-flex gap-2">
          <Form.Control
            type="search"
            value={query}
            placeholder="e.g. Yosemite National Park"
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button
            variant="outline-primary"
            className="text-nowrap"
            disabled={nearbyPlaces.status === 'locating' || nearbyPlaces.status === 'loading'}
            onClick={requestNearbyPlaces}
          >
            <GeoAlt />
            &nbsp;Use current location
          </Button>
        </div>
      </Form.Group>
      <InaturalistSearchUrlForm offlineMode={offlineMode} onApply={onApplyInaturalistUrl} />
      {message && <p>{message}</p>}
      <SelectionGrid>{placesElems}</SelectionGrid>
    </>
  );
};

type PlacesToShow = { places: Place[]; message: string | null };

const describeSearchedPlaces = (search: PlaceSearch, query: string): PlacesToShow => {
  switch (search.status) {
    case 'searching':
      return { places: [], message: 'Searching…' };
    case 'done':
      return {
        places: search.results,
        message: search.results.length === 0 ? `No places found matching “${query.trim()}”.` : null,
      };
    default:
      return {
        places: [],
        message: 'Could not search for places. Check your connection and try again.',
      };
  }
};

const describeNearbyPlaces = (nearbyPlaces: NearbyPlaces): PlacesToShow => {
  switch (nearbyPlaces.status) {
    case 'unrequested':
      return { places: [], message: null };
    case 'locating':
      return { places: [], message: 'Finding your location…' };
    case 'loading':
      return { places: [], message: 'Loading places near you…' };
    case 'done':
      return {
        places: nearbyPlaces.results,
        message: nearbyPlaces.results.length === 0 ? 'No places found near you.' : null,
      };
    case 'failed':
      return { places: [], message: nearbyPlaces.reason };
  }
};

// Skips ahead to the flashcards for a search already built up on iNaturalist,
// so it does not have to be rebuilt here by hand.
const InaturalistSearchUrlForm = ({
  offlineMode,
  onApply,
}: {
  offlineMode: boolean;
  onApply: (place: Place, iconicTaxon: IconicTaxa | undefined, filters: SpeciesFilters) => void;
}) => {
  const [enteredUrl, setEnteredUrl] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [lookupFailed, setLookupFailed] = useState(false);

  const parsedUrl = enteredUrl.trim() === '' ? null : parseInaturalistSearchUrl(enteredUrl);

  const applyEnteredUrl = (event: React.FormEvent) => {
    event.preventDefault();
    if (!parsedUrl?.ok || isApplying) {
      return;
    }
    const searchUrl = parsedUrl.value;
    setIsApplying(true);
    setLookupFailed(false);
    resolvePlaceFromSearchUrl(searchUrl, offlineMode)
      .then((place) => onApply(place, searchUrl.iconicTaxon, searchUrl.filters))
      .catch((error) => {
        console.warn('Could not apply iNaturalist search URL', error);
        setLookupFailed(true);
        setIsApplying(false);
      });
  };

  return (
    <Form onSubmit={applyEnteredUrl}>
      <Form.Group className="mb-3" controlId="inaturalist-search-url">
        <Form.Label>Or paste an iNaturalist search URL</Form.Label>
        <div className="d-flex gap-2">
          <Form.Control
            type="url"
            value={enteredUrl}
            placeholder="e.g. https://www.inaturalist.org/observations?place_id=1723&iconic_taxa=Aves"
            autoComplete="off"
            onChange={(event) => {
              setEnteredUrl(event.target.value);
              setLookupFailed(false);
            }}
          />
          <Button type="submit" disabled={!parsedUrl?.ok || isApplying}>
            {isApplying ? 'Loading…' : 'Apply'}
          </Button>
        </div>
        <Form.Text>
          The place or map area, category and month/establishment filters from the URL are used.
        </Form.Text>
      </Form.Group>
      {parsedUrl && !parsedUrl.ok && <p className="text-danger">{parsedUrl.reason}</p>}
      {parsedUrl?.ok && (
        <ul>
          {describeInaturalistSearchUrl(parsedUrl.value).map((description) => (
            <li key={description}>{description}</li>
          ))}
        </ul>
      )}
      {lookupFailed && (
        <p className="text-danger">
          Could not look up that place on iNaturalist. Please try again.
        </p>
      )}
    </Form>
  );
};

const PlaceLayer = ({ geometry }: { geometry: GeoJsonObject }) => {
  const map = useMap();

  return (
    <GeoJSON
      data={geometry}
      onEachFeature={(_feature, layer) => {
        if (layer instanceof Polyline) {
          map.fitBounds(layer.getBounds());
        } else {
          console.warn('Could not retrieve bounds of GeoJSON');
        }
      }}
    />
  );
};
