export const APP_NAME = 'RideShare';
export const APP_DESCRIPTION = 'A modern ride-sharing platform with real-time tracking, driver/passenger modes, and seamless booking.';

export const COLORS = {
  primary: '#3b82f6', // blue-500
  secondary: '#0ea5e9', // sky-500
  accent: '#f59e0b', // amber-500
  background: '#0a0a0a', // neutral-950
  surface: '#171717', // neutral-900
  text: '#ffffff',
  textSecondary: '#a3a3a3', // neutral-400
};

export const RIDE_TYPES = [
  { id: 'economy', name: 'Economy', priceMultiplier: 1.0, icon: 'Car' },
  { id: 'luxury', name: 'Luxury', priceMultiplier: 2.5, icon: 'Sparkles' },
  { id: 'suv', name: 'SUV', priceMultiplier: 1.8, icon: 'Truck' },
  { id: 'electric', name: 'Electric', priceMultiplier: 1.2, icon: 'Zap' },
];

export const JORDAN_BASE_FARE = 0.35; // JOD
export const JORDAN_KM_RATE = 0.25; // JOD per km
export const JORDAN_FARE_REDUCTION = 0.05; // 5% reduction
export const JORDAN_MINIMUM_FARE = 1.0; // 1 JOD
