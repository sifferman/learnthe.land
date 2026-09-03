import { useState } from 'react';
import { iNaturalistApi, Place } from './inaturalist';
import { fakePlace } from './inaturalist-fake-data';
import { Location } from './location';

export type NearbyPlaces =
  | { status: 'unrequested' }
  | { status: 'locating' }
  | { status: 'loading' }
  | { status: 'done'; results: Place[] }
  | { status: 'failed'; reason: string };

// Asking for a location is left until someone asks for places near them, so the
// browser's permission prompt is never the first thing the app does.
export const useNearbyPlaces = (offlineMode: boolean) => {
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlaces>({ status: 'unrequested' });

  const requestNearbyPlaces = async () => {
    setNearbyPlaces({ status: 'locating' });

    if (offlineMode) {
      setNearbyPlaces({ status: 'done', results: [fakePlace] });
      return;
    }

    let location: Location;
    try {
      location = await fetchCurrentLocation();
    } catch (error) {
      console.warn('Could not get the current location', error);
      setNearbyPlaces({
        status: 'failed',
        reason: 'Could not get your location. Search for a place by name instead.',
      });
      return;
    }

    setNearbyPlaces({ status: 'loading' });
    try {
      const nearby = await iNaturalistApi.fetchPlaces(location);
      setNearbyPlaces({ status: 'done', results: nearby.standard });
    } catch (error) {
      console.warn('Could not load nearby places', error);
      setNearbyPlaces({
        status: 'failed',
        reason: 'Could not load places near you. Check your connection and try again.',
      });
    }
  };

  return { nearbyPlaces, requestNearbyPlaces };
};

const fetchCurrentLocation = () =>
  new Promise<Location>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This browser cannot report a location'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      reject,
    );
  });
