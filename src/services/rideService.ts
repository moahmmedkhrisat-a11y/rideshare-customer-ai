import { RideRequest } from '../types';
import { RIDE_TYPES } from '../constants';

export const getEstimatedPrice = (rideTypeId: string, distanceKm: number) => {
  const rideType = RIDE_TYPES.find(r => r.id === rideTypeId);
  if (!rideType) return 0;
  return distanceKm * 2 * rideType.priceMultiplier;
};

export const mockRides: RideRequest[] = [
  {
    id: '1',
    passengerId: 'user1',
    passengerName: 'Mohammed Khrisat',
    pickup: { address: 'Home', lat: 0, lng: 0 },
    destination: { address: 'Work', lat: 0, lng: 0 },
    status: 'completed',
    price: 12.50,
    distance: '5.2 km',
    duration: '12 mins',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  // Add more mock rides if needed
];
