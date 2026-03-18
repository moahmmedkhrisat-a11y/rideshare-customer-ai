import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Search, Clock, Calendar, X, TrendingUp, Home as HomeIcon, Briefcase, ChevronRight, Users } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { RIDE_TYPES, JORDAN_BASE_FARE, JORDAN_KM_RATE, JORDAN_FARE_REDUCTION, JORDAN_MINIMUM_FARE } from '../constants';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, doc, updateDoc, getDoc, query, where, onSnapshot, deleteDoc } from 'firebase/firestore';
import { useTheme } from '../ThemeContext';

// Fix Leaflet icon issue
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const AMMAN_CENTER: [number, number] = [31.9454, 35.9284];

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

function MapEvents({ onMapClick }: { onMapClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function RouteBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p[0], p[1]]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map]);
  return null;
}

export default function Home() {
  const { theme } = useTheme();
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedRide, setSelectedRide] = useState(RIDE_TYPES[0].id);
  const [isBooking, setIsBooking] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(AMMAN_CENTER);
  const [selectionMode, setSelectionMode] = useState<'pickup' | 'destination' | null>(null);
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('07:00');
  const [scheduleDays, setScheduleDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [liveTrip, setLiveTrip] = useState<{ active: boolean; driverPos: [number, number]; progress: number; pointIndex?: number; rideId?: number } | null>(null);
  const [trafficFactor, setTrafficFactor] = useState(1.0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [activeRideId, setActiveRideId] = useState<number | null>(null);
  const [showRideOptions, setShowRideOptions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [upcomingScheduled, setUpcomingScheduled] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'rides'),
      where('uid', '==', auth.currentUser.uid),
      where('status', '==', 'Scheduled')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUpcomingScheduled(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);
  const [isWaitingForDriver, setIsWaitingForDriver] = useState(false);
  const [driverDetails, setDriverDetails] = useState<{ name: string; car: string; plate: string; rating: number; photo: string } | null>(null);
  const [showDriverPopup, setShowDriverPopup] = useState(false);
  const [showArrivalNotification, setShowArrivalNotification] = useState(false);
  const [showPickupNotification, setShowPickupNotification] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState<{ home?: string; work?: string }>({});
  const trackingInterval = React.useRef<NodeJS.Timeout | null>(null);

  const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ' Amman Jordan')}`);
      const data = await res.json();
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    }
    return null;
  };

  const handleSearchRoute = async () => {
    let pCoords = pickupCoords;
    let dCoords = destCoords;

    if (pickup && !pCoords) {
      pCoords = await geocodeAddress(pickup);
      if (pCoords) setPickupCoords(pCoords);
    }
    if (destination && !dCoords) {
      dCoords = await geocodeAddress(destination);
      if (dCoords) setDestCoords(dCoords);
    }
  };

  useEffect(() => {
    const fetchSavedPlaces = async () => {
      if (auth.currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            setSavedPlaces(userDoc.data().savedPlaces || {});
          }
        } catch (err) {
          console.error('Error fetching saved places:', err);
        }
      }
    };
    fetchSavedPlaces();
  }, []);

  useEffect(() => {
    const updateTraffic = () => {
      const now = new Date();
      // Convert to Amman time (UTC+3)
      const ammanHour = (now.getUTCHours() + 3) % 24;
      const day = now.getUTCDay(); // 5 is Friday
      
      let factor = 1.0;
      
      // Amman Rush Hours
      if (day !== 5) { // Not Friday
        if (ammanHour >= 7 && ammanHour <= 9) factor = 1.4; // Morning rush
        else if (ammanHour >= 15 && ammanHour <= 18) factor = 1.6; // Afternoon rush
        else if (ammanHour >= 22 || ammanHour <= 5) factor = 0.9; // Late night
      } else {
        // Friday pattern (usually busy in the evening)
        if (ammanHour >= 17 && ammanHour <= 21) factor = 1.3;
      }
      
      setTrafficFactor(factor);
    };

    updateTraffic();
    const interval = setInterval(updateTraffic, 3600000); // Update every hour
    return () => {
      clearInterval(interval);
      if (trackingInterval.current) clearInterval(trackingInterval.current);
    };
  }, []);

  useEffect(() => {
    const fetchRoute = async () => {
      if (pickupCoords && destCoords && !liveTrip) {
        try {
          const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${pickupCoords[1]},${pickupCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson`);
          const data = await response.json();
          if (data.routes && data.routes[0]) {
            const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
            setRoutePoints(coords);
          }
        } catch (err) {
          console.error('Error fetching route preview:', err);
        }
      } else if (!pickupCoords || !destCoords) {
        setRoutePoints([]);
      }
    };
    fetchRoute();
  }, [pickupCoords, destCoords, liveTrip]);

  const calculateDistance = (p1: [number, number], p2: [number, number]) => {
    const R = 6371; // Earth's radius in km
    const dLat = (p2[0] - p1[0]) * Math.PI / 180;
    const dLon = (p2[1] - p1[1]) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calculateFare = (multiplier: number) => {
    if (!pickupCoords || !destCoords) return null;
    
    const distance = calculateDistance(pickupCoords, destCoords);
    const baseFare = JORDAN_BASE_FARE + (distance * JORDAN_KM_RATE);
    const fareWithMultiplier = baseFare * multiplier * trafficFactor;
    const reducedFare = fareWithMultiplier * (1 - JORDAN_FARE_REDUCTION);
    return {
      price: Math.max(JORDAN_MINIMUM_FARE, reducedFare).toFixed(2),
      distance: distance.toFixed(1),
      eta: Math.ceil((distance * 2 + 2) * trafficFactor) // ETA increases with traffic
    };
  };

  const startLiveTracking = async (start: [number, number], end: [number, number], rideId: string) => {
    if (trackingInterval.current) clearInterval(trackingInterval.current);
    
    try {
      // Fetch real road route from OSRM
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`);
      const data = await response.json();
      
      if (data.routes && data.routes[0]) {
        const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
        setRoutePoints(coords);
        setLiveTrip({ active: true, driverPos: coords[0], progress: 0, pointIndex: 0, rideId: 0 }); // Using 0 as dummy for state
        
        let pointIndex = 0;
        trackingInterval.current = setInterval(async () => {
          pointIndex++;
          
          if (pointIndex >= coords.length) {
            if (trackingInterval.current) clearInterval(trackingInterval.current);
            setLiveTrip(null);
            setActiveRideId(null);
            setRoutePoints([]);
            setShowArrivalNotification(true);
            
            try {
              await updateDoc(doc(db, 'rides', rideId), { status: 'Completed' });
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `rides/${rideId}`);
            }
            return;
          }
          
          const progress = Math.floor((pointIndex / coords.length) * 100);
          setLiveTrip({
            active: true,
            driverPos: coords[pointIndex],
            progress,
            pointIndex,
            rideId: 0
          });
        }, 150); // Adjust speed
      }
    } catch (err) {
      console.error('Routing error:', err);
    }
  };

  const handleCancelRide = async () => {
    if (!activeRideId) return;
    const rideIdStr = activeRideId.toString();
    
    try {
      await updateDoc(doc(db, 'rides', rideIdStr), { status: 'Cancelled' });
      if (trackingInterval.current) clearInterval(trackingInterval.current);
      setLiveTrip(null);
      setActiveRideId(null);
      setShowCancelConfirm(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rides/${rideIdStr}`);
    }
  };

  const handleMapClick = (latlng: L.LatLng) => {
    const coords: [number, number] = [latlng.lat, latlng.lng];
    if (selectionMode === 'pickup') {
      setPickup(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
      setPickupCoords(coords);
      setSelectionMode(null);
    } else if (selectionMode === 'destination') {
      setDestination(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
      setDestCoords(coords);
      setSelectionMode(null);
    }
  };

  const handleFindRide = () => {
    setIsSearching(true);
  };

  const handleBookRide = async () => {
    if (!pickup || !destination || !auth.currentUser) {
      alert('Please select pickup and destination first.');
      return;
    }
    
    setIsBooking(true);
    
    try {
      const rideType = RIDE_TYPES.find(r => r.id === selectedRide);
      const fare = calculateFare(rideType?.priceMultiplier || 1);
      
      if (!fare) {
        alert('Please select pickup and destination on the map.');
        setIsBooking(false);
        return;
      }
      
      const rideData = {
        uid: auth.currentUser.uid,
        pickup,
        destination,
        pickupCoords: pickupCoords,
        destCoords: destCoords,
        price: fare.price,
        type: rideType?.name,
        status: 'Active',
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'rides'), rideData);
      
      setIsBooking(false);
      setIsSearching(false);
      setIsWaitingForDriver(true);
      
      // Simulate driver matching
      setTimeout(() => {
        setIsWaitingForDriver(false);
        setDriverDetails({
          name: 'Ahmad Al-Fayez',
          car: 'Tesla Model 3 - White',
          plate: '24-88901',
          rating: 4.9,
          photo: 'https://picsum.photos/seed/driver1/200/200'
        });
        setShowDriverPopup(true);
        
        // Simulate driver arriving at pickup after a short delay
        setTimeout(() => {
          setShowPickupNotification(true);
        }, 2000);
        
        setActiveRideId(docRef.id as any);
        if (pickupCoords && destCoords) {
          startLiveTracking(pickupCoords, destCoords, docRef.id);
        }
      }, 4000);

      setPickup('');
      setDestination('');
      setPickupCoords(null);
      setDestCoords(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'rides');
      setIsBooking(false);
    }
  };

  const handleScheduleRide = async () => {
    if (!pickup || !destination || !auth.currentUser) return;
    
    setIsBooking(true);
    
    try {
      const rideType = RIDE_TYPES.find(r => r.id === selectedRide);
      const fare = calculateFare(rideType?.priceMultiplier || 1);
      
      if (!fare) {
        alert('Please select pickup and destination on the map.');
        setIsBooking(false);
        return;
      }
      
      const rideData = {
        uid: auth.currentUser.uid,
        pickup,
        destination,
        pickupCoords: pickupCoords,
        destCoords: destCoords,
        price: fare.price,
        type: rideType?.name,
        status: 'Scheduled',
        createdAt: new Date().toISOString(),
        scheduleTime,
        scheduleDays
      };

      await addDoc(collection(db, 'rides'), rideData);
      
      setIsBooking(false);
      setShowScheduleModal(false);
      setPickup('');
      setDestination('');
      alert('Trip scheduled successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'rides');
      setIsBooking(false);
    }
  };

  return (
    <div className="relative h-[calc(100vh-120px)] w-full overflow-hidden rounded-3xl bg-neutral-100 dark:bg-neutral-900 shadow-2xl border border-neutral-200 dark:border-white/5">
      {/* Full Screen Map */}
      <MapContainer center={AMMAN_CENTER} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={theme === 'dark' 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          }
        />
        <Marker position={AMMAN_CENTER}>
          <Popup>Amman, Jordan</Popup>
        </Marker>
        {pickupCoords && (
          <Marker position={pickupCoords}>
            <Popup>Pickup Point</Popup>
          </Marker>
        )}
        {destCoords && (
          <Marker position={destCoords}>
            <Popup>Destination Point</Popup>
          </Marker>
        )}
        {routePoints.length > 0 && (
          <>
            {/* Base Route Line (Remaining) */}
            <Polyline 
              positions={liveTrip?.pointIndex !== undefined ? routePoints.slice(liveTrip.pointIndex) : routePoints} 
              pathOptions={{
                color: theme === 'dark' ? "#8b5cf6" : "#6366f1",
                weight: 8,
                opacity: 0.4,
                lineCap: "round",
                lineJoin: "round"
              }}
            />
            <Polyline 
              positions={liveTrip?.pointIndex !== undefined ? routePoints.slice(liveTrip.pointIndex) : routePoints} 
              pathOptions={{
                color: theme === 'dark' ? "#06b6d4" : "#3b82f6",
                weight: 4,
                opacity: 0.8,
                lineCap: "round",
                lineJoin: "round"
              }}
            />
            
            {/* Traveled Route Line (Neon Glow) */}
            {liveTrip?.pointIndex !== undefined && liveTrip.pointIndex > 0 && (
              <>
                <Polyline 
                  positions={routePoints.slice(0, liveTrip.pointIndex + 1)} 
                  pathOptions={{
                    color: "#10b981", // Emerald glow for traveled
                    weight: 12,
                    opacity: 0.5,
                    lineCap: "round",
                    lineJoin: "round"
                  }}
                />
                <Polyline 
                  positions={routePoints.slice(0, liveTrip.pointIndex + 1)} 
                  pathOptions={{
                    color: "#34d399", // Lighter emerald for core
                    weight: 4,
                    opacity: 1,
                    lineCap: "round",
                    lineJoin: "round"
                  }}
                />
              </>
            )}
          </>
        )}
        <RouteBounds points={routePoints} />
        {liveTrip && (
          <Marker 
            position={liveTrip.driverPos}
            icon={L.icon({
              iconUrl: 'https://cdn-icons-png.flaticon.com/512/3085/3085330.png', // Better top-down car
              iconSize: [36, 36],
              iconAnchor: [18, 18]
            })}
          >
            <Popup>Driver is on the way!</Popup>
          </Marker>
        )}
        <MapUpdater center={mapCenter} />
        <MapEvents onMapClick={handleMapClick} />
      </MapContainer>

      {/* Floating UI Elements */}
      {!liveTrip && (
        <div className="absolute top-6 right-6 z-[1000] flex flex-col items-end space-y-3">
          <div className="flex items-center space-x-2 rounded-full bg-white/90 dark:bg-black/80 px-4 py-2 text-xs font-bold border border-neutral-200 dark:border-white/10 backdrop-blur-xl shadow-2xl text-neutral-900 dark:text-white">
            <Clock className="h-4 w-4 text-blue-500" />
            <span>Live in Amman</span>
          </div>
          {trafficFactor > 1.2 && (
            <div className="flex items-center space-x-2 rounded-full bg-rose-500 px-4 py-2 text-[10px] font-bold text-white shadow-xl animate-pulse">
              <TrendingUp className="h-3 w-3" />
              <span>HEAVY TRAFFIC</span>
            </div>
          )}
          <Button variant="glass" size="icon" className="h-12 w-12 rounded-2xl bg-white/80 dark:bg-black/50 backdrop-blur-xl border-neutral-200 dark:border-white/10 shadow-2xl mt-2 text-neutral-900 dark:text-white" onClick={() => setMapCenter(AMMAN_CENTER)}>
            <Navigation className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Floating Glass Panel */}
      {!isSearching && !liveTrip && (
        <div className="absolute top-6 left-6 right-6 md:w-96 md:right-auto z-[1000] bg-white/80 dark:bg-black/40 backdrop-blur-2xl border border-neutral-200 dark:border-white/10 rounded-3xl shadow-[0_0_40px_rgba(6,182,212,0.15)] p-6 transition-transform duration-300 animate-in slide-in-from-left">
          <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-6 tracking-tight">Where to, {auth.currentUser?.displayName?.split(' ')[0] || 'User'}?</h2>
          
          <div className="flex items-center space-x-3 mb-6">
            <button 
              onClick={() => setIsSearching(true)}
              className="flex-1 bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 border border-neutral-200 dark:border-white/10 transition-colors rounded-2xl p-4 flex items-center space-x-3 text-left"
            >
              <Search className="h-6 w-6 text-cyan-500 dark:text-cyan-400" />
              <span className="text-lg font-medium text-neutral-600 dark:text-white/80">Search destination...</span>
            </button>
            <button 
              onClick={() => setShowScheduleModal(true)}
              className="bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 border border-neutral-200 dark:border-white/10 transition-colors rounded-2xl p-4 flex items-center justify-center flex-shrink-0 group"
            >
              <div className="flex flex-col items-center">
                <Clock className="h-5 w-5 text-violet-500 dark:text-violet-400 mb-1" />
                <span className="text-[10px] font-bold text-neutral-600 dark:text-white/80 uppercase tracking-widest">Later</span>
              </div>
            </button>
          </div>
          
          {/* Saved Places */}
          {(savedPlaces.home || savedPlaces.work) && (
            <div className="flex space-x-3 mb-6">
              {savedPlaces.home && (
                <button onClick={() => { setDestination(savedPlaces.home!); setDestCoords(null); setIsSearching(true); }} className="flex-1 flex items-center space-x-3 p-3 bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 border border-neutral-200 dark:border-white/5 transition-colors rounded-2xl">
                  <div className="bg-cyan-500/20 p-2 rounded-xl">
                    <HomeIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div className="text-left flex-1 overflow-hidden">
                    <p className="font-bold text-neutral-900 dark:text-white text-sm">Home</p>
                    <p className="text-xs text-neutral-500 dark:text-white/50 truncate">{savedPlaces.home}</p>
                  </div>
                </button>
              )}
              {savedPlaces.work && (
                <button onClick={() => { setDestination(savedPlaces.work!); setDestCoords(null); setIsSearching(true); }} className="flex-1 flex items-center space-x-3 p-3 bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 border border-neutral-200 dark:border-white/5 transition-colors rounded-2xl">
                  <div className="bg-violet-500/20 p-2 rounded-xl">
                    <Briefcase className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="text-left flex-1 overflow-hidden">
                    <p className="font-bold text-neutral-900 dark:text-white text-sm">Work</p>
                    <p className="text-xs text-neutral-500 dark:text-white/50 truncate">{savedPlaces.work}</p>
                  </div>
                </button>
              )}
            </div>
          )}

          {upcomingScheduled.length > 0 && (
            <div className="flex flex-col space-y-2">
              <h3 className="text-xs font-bold text-neutral-500 dark:text-white/50 uppercase tracking-widest mb-1">Scheduled Rides</h3>
              {upcomingScheduled.slice(0, 2).map((ride) => (
                <div key={ride.id} className="group relative flex items-center space-x-3 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 px-4 py-3 text-neutral-900 dark:text-white transition-colors hover:bg-neutral-200 dark:hover:bg-white/10">
                  <div className="bg-violet-500/20 p-2 rounded-xl border border-violet-500/30">
                    <Calendar className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex flex-col flex-1 mr-6">
                    <span className="text-xs font-bold truncate max-w-[120px] text-neutral-900 dark:text-white">{ride.destination}</span>
                    <span className="text-[10px] font-medium text-cyan-600 dark:text-cyan-400">{ride.scheduleTime} • {ride.scheduleDays?.join(', ')}</span>
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        await deleteDoc(doc(db, 'rides', ride.id));
                      } catch (err) {
                        console.error('Error cancelling scheduled trip:', err);
                      }
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-200 dark:bg-white/5 hover:bg-neutral-300 dark:hover:bg-white/10 p-1.5 rounded-lg border border-neutral-300 dark:border-white/10"
                  >
                    <X className="h-3 w-3 text-neutral-500 dark:text-white/60 hover:text-neutral-900 dark:hover:text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating Search & Ride Selection */}
      {isSearching && !selectionMode && (
        <>
          {/* Top Search Bar */}
          <div className="absolute top-6 left-6 right-6 md:w-96 md:right-auto z-[2000] bg-white/80 dark:bg-black/40 backdrop-blur-2xl border border-neutral-200 dark:border-white/10 shadow-[0_0_40px_rgba(6,182,212,0.15)] p-4 rounded-3xl animate-in slide-in-from-left duration-300">
            <div className="flex items-start space-x-3">
              <button onClick={() => setIsSearching(false)} className="mt-2 p-2 rounded-full bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-900 dark:text-white transition-colors">
                <ChevronRight className="h-5 w-5 rotate-180" />
              </button>
              <div className="flex-1 relative">
                {/* Vertical connecting line */}
                <div className="absolute left-[11px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-cyan-500 to-violet-500 z-0" />
                
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 ml-2 flex-shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                    <div className="flex-1 flex items-center bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl pr-2">
                      <Input
                        placeholder="Pickup location"
                        value={pickup}
                        onChange={(e) => {
                          setPickup(e.target.value);
                          setPickupCoords(null);
                        }}
                        className="bg-transparent border-transparent focus:bg-transparent focus:border-transparent h-12 text-sm flex-1 text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-white/40"
                      />
                      <button onClick={() => setSelectionMode('pickup')} className="p-2 text-cyan-500 dark:text-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors">
                        <MapPin className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-violet-500 dark:bg-violet-400 ml-2 flex-shrink-0 shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
                    <div className="flex-1 flex items-center bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl pr-2">
                      <Input
                        placeholder="Where to?"
                        value={destination}
                        onChange={(e) => {
                          setDestination(e.target.value);
                          setDestCoords(null);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchRoute()}
                        className="bg-transparent border-transparent focus:bg-transparent focus:border-transparent h-12 text-sm flex-1 text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-white/40"
                        autoFocus
                      />
                      <button onClick={() => setSelectionMode('destination')} className="p-2 text-violet-400 hover:text-violet-300 transition-colors">
                        <MapPin className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Button 
              onClick={handleSearchRoute}
              className="w-full mt-4 h-12 rounded-xl font-bold bg-neutral-200 dark:bg-white/10 hover:bg-neutral-300 dark:hover:bg-white/20 text-neutral-900 dark:text-white border border-neutral-300 dark:border-white/10 transition-colors"
            >
              Find Route
            </Button>
          </div>

          {/* Bottom Ride Options */}
          {routePoints.length > 0 && (
            <div className="absolute bottom-6 left-6 right-6 md:w-96 md:right-auto md:top-64 md:bottom-auto z-[2000] bg-white/80 dark:bg-black/40 backdrop-blur-2xl border border-neutral-200 dark:border-white/10 rounded-3xl shadow-[0_0_40px_rgba(139,92,246,0.15)] p-5 animate-in slide-in-from-bottom-10 md:slide-in-from-left duration-300">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4 tracking-tight">Select Class</h3>
              
              <div className="space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar mb-4">
                {RIDE_TYPES.map((ride) => (
                  <button
                    key={ride.id}
                    onClick={() => setSelectedRide(ride.id)}
                    className={`relative w-full flex items-center justify-between p-4 rounded-2xl transition-all overflow-hidden ${
                      selectedRide === ride.id
                        ? 'bg-gradient-to-r from-cyan-500/10 to-violet-500/10 dark:from-cyan-500/20 dark:to-violet-500/20 border-2 border-cyan-500 dark:border-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)] dark:shadow-[inset_0_0_20px_rgba(6,182,212,0.3)]'
                        : 'bg-neutral-100 dark:bg-white/5 border-2 border-transparent hover:bg-neutral-200 dark:hover:bg-white/10'
                    }`}
                  >
                    {selectedRide === ride.id && (
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-violet-400/5 dark:from-cyan-400/10 dark:to-violet-400/10 animate-pulse" />
                    )}
                    <div className="flex items-center space-x-4 relative z-10">
                      <div className="w-12 h-12 rounded-xl bg-white/50 dark:bg-black/50 flex items-center justify-center border border-neutral-200 dark:border-white/10">
                        <img 
                          src={ride.id === 'economy' ? 'https://cdn-icons-png.flaticon.com/512/3085/3085330.png' : 'https://cdn-icons-png.flaticon.com/512/3085/3085330.png'} 
                          alt={ride.name}
                          className="w-8 h-8 object-contain opacity-80"
                        />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-neutral-900 dark:text-white">{ride.name}</p>
                          <div className="flex items-center space-x-1 text-[10px] font-bold text-neutral-500 dark:text-white/50 bg-neutral-200 dark:bg-white/10 px-2 py-0.5 rounded-full">
                            <Users className="h-3 w-3" />
                            <span>{ride.id === 'xl' ? '6' : '4'}</span>
                          </div>
                        </div>
                        <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mt-0.5">
                          {calculateFare(ride.priceMultiplier) 
                            ? `${calculateFare(ride.priceMultiplier)?.eta} min dropoff`
                            : 'Select route'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg text-neutral-900 dark:text-white">
                        {calculateFare(ride.priceMultiplier) 
                          ? `${calculateFare(ride.priceMultiplier)?.price} JOD`
                          : '--'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-neutral-200 dark:border-white/10">
                <Button 
                  variant="outline" 
                  className="h-14 rounded-2xl font-bold border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/5 text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-white/10 w-16 flex-shrink-0" 
                  onClick={() => setShowScheduleModal(true)}
                >
                  <Clock className="h-5 w-5 text-violet-500 dark:text-violet-400" />
                </Button>
                <Button 
                  className="flex-1 h-14 rounded-2xl font-black text-lg bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white shadow-lg shadow-cyan-500/25 transition-all" 
                  onClick={handleBookRide} 
                  isLoading={isBooking}
                >
                  Confirm {RIDE_TYPES.find(r => r.id === selectedRide)?.name}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Live Trip Overlay */}
      {liveTrip && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-4 animate-in slide-in-from-top-10 duration-500">
          <Card variant="glass" className="p-5 border-cyan-500/30 bg-white/90 dark:bg-black/80 backdrop-blur-2xl shadow-[0_0_40px_rgba(6,182,212,0.15)] rounded-3xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                  <Navigation className="h-6 w-6 text-cyan-600 dark:text-cyan-400 animate-pulse" />
                </div>
                <div>
                  <p className="font-black text-base tracking-tight text-neutral-900 dark:text-white">On the way</p>
                  <p className="text-[10px] text-cyan-600/80 dark:text-cyan-400/80 uppercase font-black tracking-widest">Arriving in {Math.ceil((100 - liveTrip.progress) / 10)} min</p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-violet-500 dark:from-cyan-400 dark:to-violet-400">{liveTrip.progress}%</p>
                <button 
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-[10px] font-black text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 uppercase mt-1 tracking-tighter transition-colors"
                >
                  Cancel Ride
                </button>
              </div>
            </div>
            <div className="w-full bg-neutral-200 dark:bg-white/5 h-2 rounded-full overflow-hidden border border-neutral-300 dark:border-white/10">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-violet-500 h-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                style={{ width: `${liveTrip.progress}%` }}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Selection Mode Indicator */}
      {selectionMode && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[1000]">
          <div className="rounded-full bg-white/90 dark:bg-black/80 backdrop-blur-md px-6 py-3 text-sm font-black text-neutral-900 dark:text-white shadow-[0_0_30px_rgba(139,92,246,0.3)] animate-bounce border border-violet-500/50">
            Tap map to set {selectionMode}
          </div>
        </div>
      )}

      {/* Modals */}
      {isWaitingForDriver && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-neutral-900/20 dark:bg-black/60 p-4 backdrop-blur-md">
          <Card className="w-full max-w-sm space-y-8 border-cyan-500/20 bg-white/90 dark:bg-black/80 backdrop-blur-2xl p-10 text-center rounded-[2.5rem] shadow-[0_0_100px_rgba(6,182,212,0.15)]">
            <div className="relative mx-auto h-32 w-32">
              <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 dark:border-t-cyan-400 animate-spin shadow-[0_0_30px_rgba(6,182,212,0.3)]" />
              <div className="absolute inset-4 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30">
                <Search className="h-10 w-10 text-cyan-600 dark:text-cyan-400 animate-pulse drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-black tracking-tighter text-neutral-900 dark:text-white">Finding Driver</h2>
              <p className="text-sm text-neutral-600 dark:text-white/60 leading-relaxed font-medium">
                Searching for the nearest driver in Amman to pick you up...
              </p>
            </div>
            <div className="flex flex-col space-y-4">
              <div className="flex justify-center space-x-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-1.5 w-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-bounce shadow-[0_0_5px_rgba(6,182,212,0.8)]" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <Button variant="outline" className="h-14 rounded-2xl border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-600 dark:text-white/60 transition-colors" onClick={() => setIsWaitingForDriver(false)}>
                Cancel Request
              </Button>
            </div>
          </Card>
        </div>
      )}

      {showDriverPopup && driverDetails && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-neutral-900/20 dark:bg-black/60 p-4 backdrop-blur-md">
          <Card className="w-full max-w-sm overflow-hidden border-neutral-200 dark:border-white/10 bg-white/90 dark:bg-black/80 backdrop-blur-2xl p-0 rounded-[2.5rem] shadow-[0_0_60px_rgba(139,92,246,0.15)] animate-in zoom-in-95 duration-300">
            <div className="relative h-32 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 dark:from-cyan-500/20 dark:to-violet-500/20 border-b border-neutral-200 dark:border-white/10">
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                <div className="relative h-24 w-24 rounded-3xl border border-neutral-300 dark:border-white/20 bg-white dark:bg-black overflow-hidden shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                  <img src={driverDetails.photo} alt={driverDetails.name} className="h-full w-full object-cover opacity-90" referrerPolicy="no-referrer" />
                </div>
              </div>
              <button onClick={() => setShowDriverPopup(false)} className="absolute top-4 right-4 rounded-full bg-white/80 dark:bg-black/40 p-2 text-neutral-600 dark:text-white/70 hover:text-neutral-900 dark:hover:text-white backdrop-blur-md border border-neutral-200 dark:border-white/10 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="px-8 pb-8 pt-16 text-center space-y-6">
              <div className="space-y-1">
                <h3 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">{driverDetails.name}</h3>
                <div className="flex items-center justify-center space-x-1 text-cyan-600 dark:text-cyan-400">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-xs font-black uppercase tracking-widest">{driverDetails.rating} Rating</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-neutral-100 dark:bg-white/5 p-4 border border-neutral-200 dark:border-white/10">
                  <p className="text-[10px] font-black text-neutral-500 dark:text-white/40 uppercase tracking-widest mb-1">Vehicle</p>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">{driverDetails.car}</p>
                </div>
                <div className="rounded-2xl bg-neutral-100 dark:bg-white/5 p-4 border border-neutral-200 dark:border-white/10">
                  <p className="text-[10px] font-black text-neutral-500 dark:text-white/40 uppercase tracking-widest mb-1">Plate</p>
                  <p className="text-xs font-black text-violet-600 dark:text-violet-400">{driverDetails.plate}</p>
                </div>
              </div>

              <div className="flex items-center justify-center space-x-2 rounded-2xl bg-cyan-500/10 p-4 border border-cyan-500/30 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]">
                <div className="h-2 w-2 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                <p className="text-xs font-bold text-cyan-700 dark:text-cyan-300">Driver has accepted your ride!</p>
              </div>

              <Button className="w-full h-16 rounded-2xl font-black text-lg bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white shadow-lg shadow-cyan-500/25 transition-all" onClick={() => setShowDriverPopup(false)}>
                Got it!
              </Button>
            </div>
          </Card>
        </div>
      )}

      {showPickupNotification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[4000] w-full max-w-sm px-4 animate-in slide-in-from-top-10 duration-500">
          <Card className="flex items-center space-x-4 border-cyan-500/30 bg-white/90 dark:bg-black/80 p-4 backdrop-blur-2xl rounded-3xl shadow-[0_0_40px_rgba(6,182,212,0.2)]">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Navigation className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-neutral-900 dark:text-white">Driver Arrived!</p>
              <p className="text-[10px] text-cyan-600/80 dark:text-cyan-400/80 font-bold uppercase tracking-wider">Ahmad is outside in the Tesla</p>
            </div>
            <button onClick={() => setShowPickupNotification(false)} className="text-neutral-500 dark:text-white/40 hover:text-neutral-900 dark:hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </Card>
        </div>
      )}

      {showArrivalNotification && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-neutral-900/20 dark:bg-black/60 p-4 backdrop-blur-md">
          <Card className="w-full max-w-sm space-y-8 border-violet-500/20 bg-white/90 dark:bg-black/80 p-10 text-center rounded-[2.5rem] shadow-[0_0_100px_rgba(139,92,246,0.15)] backdrop-blur-2xl animate-in zoom-in-95 duration-500">
            <div className="relative mx-auto h-32 w-32">
              <div className="absolute inset-0 rounded-full bg-violet-500/10 animate-ping shadow-[0_0_30px_rgba(139,92,246,0.3)]" />
              <div className="absolute inset-0 rounded-full bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
                <MapPin className="h-12 w-12 text-violet-600 dark:text-violet-400 drop-shadow-[0_0_15px_rgba(139,92,246,0.8)]" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-black tracking-tighter text-neutral-900 dark:text-white">You've Arrived!</h2>
              <p className="text-sm text-neutral-600 dark:text-white/60 leading-relaxed font-medium">
                Your driver has reached the destination. Please check your belongings before exiting the vehicle.
              </p>
            </div>
            <Button 
              className="w-full h-16 rounded-2xl font-black text-lg bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-400 hover:to-cyan-400 text-white shadow-lg shadow-violet-500/25 transition-all" 
              onClick={() => setShowArrivalNotification(false)}
            >
              Finish Trip
            </Button>
          </Card>
        </div>
      )}

      {showCancelConfirm && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-neutral-900/20 dark:bg-black/60 p-4 backdrop-blur-md">
          <Card className="w-full max-w-sm space-y-6 border-rose-500/20 bg-white/90 dark:bg-black/80 p-8 text-center rounded-3xl backdrop-blur-2xl shadow-[0_0_60px_rgba(244,63,94,0.15)]">
            <div className="mx-auto h-20 w-20 rounded-3xl bg-rose-500/10 flex items-center justify-center mb-4 border border-rose-500/30 shadow-[inset_0_0_20px_rgba(244,63,94,0.1)]">
              <X className="h-10 w-10 text-rose-500 dark:text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tighter text-neutral-900 dark:text-white">Cancel Ride?</h2>
              <p className="text-sm text-neutral-600 dark:text-white/60 leading-relaxed">
                Are you sure you want to cancel? Your driver is already on the way to your location in Amman.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/5 text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors" onClick={() => setShowCancelConfirm(false)}>
                Back
              </Button>
              <Button variant="secondary" className="flex-1 h-14 rounded-2xl font-black bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 dark:hover:bg-rose-500/30 border border-rose-500/50 transition-colors" onClick={handleCancelRide}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {showScheduleModal && (
        <div className="fixed inset-0 z-[3000] bg-neutral-900/20 dark:bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white/90 dark:bg-black/80 backdrop-blur-2xl border border-neutral-200 dark:border-white/10 rounded-3xl p-6 shadow-[0_0_40px_rgba(139,92,246,0.15)] animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">Schedule Ride</h2>
              <button onClick={() => setShowScheduleModal(false)} className="rounded-full bg-neutral-100 dark:bg-white/5 p-2 text-neutral-600 dark:text-white hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">Time</label>
                <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="h-14 bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/10 focus:bg-neutral-200 dark:focus:bg-white/10 focus:border-cyan-500 rounded-xl text-lg font-bold text-neutral-900 dark:text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">Days</label>
                <div className="flex flex-wrap gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <button
                      key={day}
                      onClick={() => setScheduleDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])}
                      className={`rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                        scheduleDays.includes(day) 
                          ? 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/25' 
                          : 'bg-neutral-100 dark:bg-white/5 text-neutral-500 dark:text-white/60 hover:bg-neutral-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 p-4">
                <p className="text-sm text-neutral-600 dark:text-white/70">
                  Your ride will be requested automatically at <span className="font-bold text-cyan-600 dark:text-cyan-400">{scheduleTime}</span> on selected days.
                </p>
              </div>
            </div>
            <Button className="w-full h-14 mt-6 rounded-xl font-black text-lg bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white shadow-lg shadow-cyan-500/25 transition-all" onClick={handleScheduleRide} isLoading={isBooking}>
              Confirm Schedule
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
