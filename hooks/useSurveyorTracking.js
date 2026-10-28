/**
 * useSurveyorTracking Hook (Admin Version)
 *
 * This hook manages real-time tracking of surveyor location for admin/assigner.
 * It connects to Socket.IO for live updates and falls back to REST API polling.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import socketService from '../lib/socket';
import { api } from '../lib/api';

// Configuration
const POLLING_INTERVAL = 30000; // 30 seconds fallback polling
const ROUTE_REFRESH_DISTANCE = 0.1; // 100 meters

// Calculate distance between two points using Haversine formula
const getDistanceBetweenPoints = (point1, point2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Fetch directions using the browser-native Maps JS DirectionsService.
// Runs entirely in the browser against the already-loaded Maps JS key (the one
// rendering the map), so it needs no backend proxy and has no CORS issue — it
// only requires the Directions API enabled on that key. Returns the exact road
// geometry (every step's decoded path).
const fetchGoogleDirections = (origin, destination) => {
    return new Promise((resolve) => {
        if (typeof window === 'undefined' || !window.google?.maps?.DirectionsService) {
            // Maps JS not loaded yet — caller will retry on the next location update.
            resolve(null);
            return;
        }

        const service = new window.google.maps.DirectionsService();
        service.route(
            {
                origin: { lat: origin.latitude, lng: origin.longitude },
                destination: { lat: destination.latitude, lng: destination.longitude },
                travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status !== 'OK' || !result?.routes?.length) {
                    console.error('Directions request failed:', status);
                    resolve(null);
                    return;
                }

                const route = result.routes[0];
                const leg = route.legs[0];

                // Concatenate each step's decoded path for the exact road geometry.
                // step.path / overview_path are arrays of google.maps.LatLng.
                let coords = [];
                const steps = Array.isArray(leg?.steps) ? leg.steps : [];
                for (const step of steps) {
                    if (Array.isArray(step.path)) {
                        coords = coords.concat(step.path.map((p) => ({ latitude: p.lat(), longitude: p.lng() })));
                    }
                }
                if (coords.length === 0 && Array.isArray(route.overview_path)) {
                    coords = route.overview_path.map((p) => ({ latitude: p.lat(), longitude: p.lng() }));
                }

                // Drop consecutive duplicate points (adjacent steps share endpoints).
                const cleanedCoords = coords.filter((c, i, self) =>
                    i === 0 || c.latitude !== self[i - 1].latitude || c.longitude !== self[i - 1].longitude
                );

                resolve({
                    coordinates: cleanedCoords,
                    distance: leg.distance.value / 1000, // km
                    duration: leg.duration.value / 60, // minutes
                    distanceText: leg.distance.text,
                    durationText: leg.duration.text,
                });
            }
        );
    });
};

export function useSurveyorTracking(surveyId, destination = null) {
    const [surveyorLocation, setSurveyorLocation] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [route, setRoute] = useState(null);
    const [eta, setEta] = useState(null);
    const [distance, setDistance] = useState(null);
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);

    const pollingIntervalRef = useRef(null);
    const isMounted = useRef(true);
    const lastRouteLocationRef = useRef(null);
    const cleanupListenersRef = useRef([]);
    // Hold the latest destination in a ref so callbacks stay stable across renders.
    // The page builds a fresh { latitude, longitude } object every render; depending
    // on it directly would rebuild updateRoute/the socket effect each render and tear
    // down + reconnect the live socket continuously (the infinite-refresh loop).
    const destinationRef = useRef(destination);
    useEffect(() => {
        destinationRef.current = destination;
    }, [destination?.latitude, destination?.longitude]);

    // Fetch location via REST API (fallback)
    const fetchLocation = useCallback(async () => {
        if (!surveyId) return;

        try {
            const response = await api.getSurveyorLocation(surveyId);
            const locationData = response.data;
            if (locationData && locationData.latitude && locationData.longitude) {
                const newLocation = {
                    latitude: parseFloat(locationData.latitude),
                    longitude: parseFloat(locationData.longitude),
                    timestamp: locationData.updated_at,
                };

                if (isMounted.current) {
                    setSurveyorLocation(newLocation);
                }
            }
        } catch (err) {
            console.error('Error fetching surveyor location:', err);
            if (isMounted.current) {
                setError('Failed to fetch location');
            }
        }
    }, [surveyId]);

    // Update route when location changes significantly. Reads destination from a
    // ref so it doesn't re-create on every parent render.
    const updateRoute = useCallback(async (location) => {
        const dest = destinationRef.current;
        if (!dest || !location) return;

        // Check if we should refresh the route
        if (lastRouteLocationRef.current) {
            const movedDistance = getDistanceBetweenPoints(lastRouteLocationRef.current, location);
            if (movedDistance < ROUTE_REFRESH_DISTANCE) {
                return; // Don't refresh if not moved far enough
            }
        }

        const routeData = await fetchGoogleDirections(location, dest);
        if (routeData && isMounted.current) {
            setRoute(routeData.coordinates);
            setEta(`${Math.round(routeData.duration)} mins`);
            setDistance(`${routeData.distance.toFixed(1)} km`);
            lastRouteLocationRef.current = location;
        }
    }, []);

    // Start tracking — depends only on stable values so the socket connection
    // persists across re-renders. Cleanup leaves the room and unsubscribes but does
    // NOT call socketService.disconnect(): the socket is a singleton shared with
    // chat/notifications, so killing it here would also kill those (and, combined
    // with a re-running effect, caused the infinite reconnect/refresh loop).
    useEffect(() => {
        if (!surveyId) return undefined;

        isMounted.current = true;
        let unsubConnect = null;

        (async () => {
            fetchLocation();

            const socket = await socketService.connect();
            if (!socket || !isMounted.current) return;

            const unsubLocation = socketService.onLocationUpdate((data) => {
                if (data.surveyId === surveyId || data.surveyId === parseInt(surveyId)) {
                    const newLocation = {
                        latitude: parseFloat(data.latitude),
                        longitude: parseFloat(data.longitude),
                        timestamp: data.timestamp,
                    };
                    if (isMounted.current) {
                        setSurveyorLocation(newLocation);
                        updateRoute(newLocation);
                    }
                }
            });
            cleanupListenersRef.current.push(unsubLocation);

            const unsubStatus = socketService.onStatusUpdate((data) => {
                if (data.surveyId === surveyId || data.surveyId === parseInt(surveyId)) {
                    if (isMounted.current) setStatus(data.status);
                }
            });
            cleanupListenersRef.current.push(unsubStatus);

            if (socket.connected) {
                setIsConnected(true);
                socketService.joinSurveyRoom(surveyId);
            }

            // Socket.IO rooms don't survive a transport reconnect, so re-join on
            // every connect event for as long as this hook is mounted.
            const handleConnect = () => {
                if (!isMounted.current) return;
                setIsConnected(true);
                socketService.joinSurveyRoom(surveyId);
            };
            const handleDisconnect = () => {
                if (isMounted.current) setIsConnected(false);
            };
            socket.on('connect', handleConnect);
            socket.on('disconnect', handleDisconnect);
            unsubConnect = () => {
                socket.off('connect', handleConnect);
                socket.off('disconnect', handleDisconnect);
            };
        })();

        pollingIntervalRef.current = setInterval(fetchLocation, POLLING_INTERVAL);

        return () => {
            isMounted.current = false;

            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }

            cleanupListenersRef.current.forEach(cleanup => cleanup && cleanup());
            cleanupListenersRef.current = [];

            if (unsubConnect) unsubConnect();

            // Leave the room but keep the singleton socket alive for chat/notifications.
            socketService.leaveSurveyRoom(surveyId);
        };
    }, [surveyId, fetchLocation, updateRoute]);

    // Re-route when destination becomes available or changes meaningfully.
    useEffect(() => {
        if (surveyorLocation && destination) {
            updateRoute(surveyorLocation);
        }
    }, [surveyorLocation, destination?.latitude, destination?.longitude, updateRoute]);

    return {
        surveyorLocation,
        isConnected,
        route,
        eta,
        distance,
        status,
        error,
        refetchLocation: fetchLocation,
    };
}
