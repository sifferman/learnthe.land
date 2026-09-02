import { Place } from '../inaturalist';
import * as React from 'react';
import { useState } from 'react';
import { Form } from 'react-bootstrap';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { GeoJsonObject } from 'geojson';
import { SelectionGrid, SelectionGridItem } from './SelectionGrid';
import { Polyline } from 'leaflet';
import { usePlaceSearch } from '../use-place-search';

export const SelectPlaceStep = ({
  places,
  offlineMode,
  onSelectPlace,
}: {
  places: Place[];
  offlineMode: boolean;
  onSelectPlace: (place: Place) => void;
}) => {
  const [query, setQuery] = useState('');
  const search = usePlaceSearch(query, offlineMode);

  // With an empty search box the nearby places stay on screen, so searching is
  // an alternative to the location-based suggestions rather than a detour.
  let shownPlaces: Place[] = [];
  let message: string | null = null;

  switch (search.status) {
    case 'idle':
      shownPlaces = places;
      break;
    case 'searching':
      message = 'Searching…';
      break;
    case 'done':
      shownPlaces = search.results;
      if (search.results.length === 0) {
        message = `No places found matching “${query.trim()}”.`;
      }
      break;
    case 'failed':
      message = 'Could not search for places. Check your connection and try again.';
      break;
  }

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
        <Form.Control
          type="search"
          value={query}
          placeholder="e.g. Yosemite National Park"
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
        />
        <Form.Text>Leave this empty to pick from the places near you.</Form.Text>
      </Form.Group>
      {message && <p>{message}</p>}
      <SelectionGrid>{placesElems}</SelectionGrid>
    </>
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
