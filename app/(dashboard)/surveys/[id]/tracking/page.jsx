'use client';

import { useState, useEffect, useRef, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import { useSurveyorTracking } from '../../../../../hooks/useSurveyorTracking';
import { api } from '../../../../../lib/api';
import {
    MdArrowBack,
    MdRefresh,
    MdLocationOn,
    MdDirectionsCar,
    MdCheckCircle,
    MdMyLocation,
    MdAccessTime,
    MdStraighten,
    MdCall,
    MdStar
} from 'react-icons/md';

// Hardcoded to the shared project key (same as web) on purpose: the deployment
// env NEXT_PUBLIC_GOOGLE_MAPS_API_KEY may hold a stale/old key which would
// otherwise override this and break the map. Keep this in sync with web.
const GOOGLE_MAPS_API_KEY = "AIzaSyAbaQ3ldMRUYmxt39TdasRdU-rtPLyZVhc";

const containerStyle = {
    width: '100%',
    height: '100%',
};

const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
    styles: [
        { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
        { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
        { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
        { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f5f5" }] },
        { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
        // Roads: white fill with a light-grey outline so the street network is
        // clearly visible against the grey land (without these the global
        // geometry rule above paints roads the same colour as the land).
        { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#ffffff" }] },
        { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#dcdcdc" }] },
        { "featureType": "road.arterial", "elementType": "geometry.fill", "stylers": [{ "color": "#ffffff" }] },
        { "featureType": "road.arterial", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
        { "featureType": "road.highway", "elementType": "geometry.fill", "stylers": [{ "color": "#ffe9a8" }] },
        { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#e6c86e" }] },
        { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#8a6d1b" }] },
        { "featureType": "transit.line", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
        { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9d7e8" }] }
    ]
};

// Helper for relative time
const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    try {
        const date = new Date(timestamp);
        const seconds = Math.floor((new Date() - date) / 1000);

        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    } catch (e) {
        return '';
    }
};

const getTrackingStatus = (status) => {
    switch (status) {
        case 'in_transit':
            return {
                color: '#FF9500',
                bgColor: '#FFF8E1',
                label: 'On the way',
                icon: MdDirectionsCar,
                message: 'Surveyor is heading to the location',
            };
        case 'arrived':
            return {
                color: '#4CAF50',
                bgColor: '#E8F5E9',
                label: 'Arrived',
                icon: MdLocationOn,
                message: 'Surveyor has arrived at the location',
            };
        case 'visit_completed':
            return {
                color: '#2196F3',
                bgColor: '#E3F2FD',
                label: 'Inspection Complete',
                icon: MdCheckCircle,
                message: 'Survey inspection completed',
            };
        default:
            return {
                color: '#666',
                bgColor: '#F5F5F5',
                label: 'Tracking',
                icon: MdMyLocation,
                message: 'Tracking surveyor location',
            };
    }
};

export default function TrackingPage({ params }) {
    // Unwrap params using React.use()
    const { id } = use(params);
    const router = useRouter();

    const [survey, setSurvey] = useState(null);
    const [loading, setLoading] = useState(true);
    const [map, setMap] = useState(null);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: GOOGLE_MAPS_API_KEY
    });

    const destinationCoords = useMemo(
        () => (survey?.latitude && survey?.longitude
            ? { lat: parseFloat(survey.latitude), lng: parseFloat(survey.longitude) }
            : null),
        [survey?.latitude, survey?.longitude]
    );

    const trackingDestination = useMemo(
        () => (destinationCoords
            ? { latitude: destinationCoords.lat, longitude: destinationCoords.lng }
            : null),
        [destinationCoords]
    );

    // Use the hook - pass destination for routing
    const {
        surveyorLocation,
        isConnected,
        route,
        eta,
        distance,
        refetchLocation
    } = useSurveyorTracking(id, trackingDestination);

    useEffect(() => {
        fetchSurvey();
    }, [id]);

    const fetchSurvey = async () => {
        try {
            setLoading(true);
            // Admin specific API call
            const res = await api.get(`/admin/surveys/${id}`);
            setSurvey(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const trackingStatus = getTrackingStatus(survey?.status);
    const StatusIcon = trackingStatus.icon;

    // Fit bounds when both locations are available
    useEffect(() => {
        if (map && surveyorLocation && destinationCoords) {
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend(destinationCoords);
            bounds.extend({ lat: surveyorLocation.latitude, lng: surveyorLocation.longitude });
            map.fitBounds(bounds, { padding: 50 });
        } else if (map && destinationCoords) {
            map.panTo(destinationCoords);
            map.setZoom(15);
        }
    }, [map, surveyorLocation, destinationCoords]);


    if (loading || !isLoaded) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!survey) {
        return <div className="p-8 text-center">Survey not found</div>;
    }

    // Get uploads URL for image display
    const uploadsUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3000';

    return (
        <div className="relative h-[calc(100vh-64px)] w-full overflow-hidden bg-gray-100 flex flex-col md:flex-row">

            {/* Map Section */}
            <div className="flex-1 relative h-full">
                {/* Header Overlay */}
                <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
                    <button
                        onClick={() => router.back()}
                        className="pointer-events-auto p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                    >
                        <MdArrowBack size={24} color="#333" />
                    </button>

                    <div className="pointer-events-auto bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                        <span className="font-semibold text-gray-800">Live Tracking</span>
                        {isConnected && (
                            <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                                LIVE
                            </span>
                        )}
                    </div>

                    <button
                        onClick={() => { refetchLocation(); fetchSurvey(); }}
                        className="pointer-events-auto p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                    >
                        <MdRefresh size={24} color="#333" />
                    </button>
                </div>

                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={destinationCoords || { lat: 20.5937, lng: 78.9629 }}
                    zoom={12}
                    onLoad={setMap}
                    options={mapOptions}
                >
                    {/* Destination Marker */}
                    {destinationCoords && (
                        <Marker
                            position={destinationCoords}
                            icon={{
                                url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                            }}
                        />
                    )}

                    {/* Surveyor Marker */}
                    {surveyorLocation && (
                        <Marker
                            position={{ lat: surveyorLocation.latitude, lng: surveyorLocation.longitude }}
                            icon={{
                                path: "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z",
                                fillColor: "#2196F3",
                                fillOpacity: 1,
                                strokeWeight: 1,
                                strokeColor: "#ffffff",
                                scale: 1.5,
                                anchor: new window.google.maps.Point(12, 12),
                            }}
                            zIndex={2}
                        />
                    )}

                    {/* Route Line */}
                    {route && (
                        <Polyline
                            path={route.map(p => ({ lat: p.latitude, lng: p.longitude }))}
                            options={{
                                strokeColor: "#2196F3",
                                strokeOpacity: 1,
                                strokeWeight: 5,
                            }}
                        />
                    )}
                </GoogleMap>

                {/* Floating ETA Card */}
                {eta && survey.status === 'in_transit' && (
                    <div className="absolute top-24 right-4 z-10 bg-white rounded-xl shadow-lg p-3 min-w-[140px] border border-gray-100 animate-in fade-in slide-in-from-right-4">
                        <div className="flex items-center gap-2 mb-2">
                            <MdAccessTime className="text-primary text-xl" />
                            <div>
                                <div className="text-xs text-gray-500 uppercase font-semibold">ETA</div>
                                <div className="font-bold text-gray-800">{eta}</div>
                            </div>
                        </div>
                        <div className="h-px bg-gray-100 my-1"></div>
                        <div className="flex items-center gap-2">
                            <MdStraighten className="text-primary text-xl" />
                            <div>
                                <div className="text-xs text-gray-500 uppercase font-semibold">Distance</div>
                                <div className="font-bold text-gray-800">{distance}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sidebar Info Panel (Bottom on Mobile, Right on Desktop) */}
            <div className="bg-white border-t md:border-t-0 md:border-l border-gray-200 w-full md:w-96 shadow-xl p-6 flex flex-col z-20 overflow-y-auto max-h-[40vh] md:max-h-full">

                {/* Status Header */}
                <div className="flex items-center gap-4 mb-6">
                    <div
                        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: trackingStatus.bgColor }}
                    >
                        <StatusIcon size={24} color={trackingStatus.color} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">{trackingStatus.label}</h2>
                        <p className="text-sm text-gray-500">{trackingStatus.message}</p>
                    </div>
                </div>

                {/* Surveyor Card */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            {/* Avatar with first letter of name */}
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-xl font-bold border-2 border-white shadow-sm">
                                {survey.surveyor_name?.[0]?.toUpperCase() || 'S'}
                            </div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-1">
                                <h3 className="font-semibold text-gray-900">{survey.surveyor_name || 'Surveyor'}</h3>
                                <MdCheckCircle className="text-blue-500" size={16} />
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                                <MdStar className="text-yellow-500" size={16} />
                                <span className="font-medium">4.8</span>
                                <span className="text-gray-400">•</span>
                                <span>156 surveys</span>
                            </div>
                        </div>

                        <a
                            href={survey.surveyor_phone ? `tel:${survey.surveyor_phone}` : '#'}
                            className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white transition-colors shadow-sm"
                            title="Call Surveyor"
                        >
                            <MdCall size={20} />
                        </a>
                    </div>
                </div>

                {/* Location Details */}
                <div className="space-y-6">
                    <div className="relative pl-6 border-l-2 border-dashed border-gray-200 space-y-8">
                        {/* Surveyor Loc */}
                        <div className="relative">
                            <div className="absolute -left-[29px] top-0 w-3 h-3 bg-blue-500 rounded-full ring-4 ring-white"></div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                                Current Location
                            </h4>
                            <p className="text-sm font-medium text-gray-900">
                                {surveyorLocation ? `Updated ${getTimeAgo(surveyorLocation.timestamp)}` : 'Waiting for location...'}
                            </p>
                        </div>

                        {/* Destination */}
                        <div className="relative">
                            <div className="absolute -left-[30px] top-0">
                                <MdLocationOn className="text-red-500 bg-white" size={20} />
                            </div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                                Survey Location
                            </h4>
                            <p className="text-sm text-gray-900 leading-snug">
                                {survey.address || `${survey.city || ''}, ${survey.state || ''}`}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-auto pt-6">
                    <button
                        onClick={() => router.back()}
                        className="w-full py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-sm"
                    >
                        Back to Survey Details
                    </button>
                </div>

            </div>
        </div>
    );
}
