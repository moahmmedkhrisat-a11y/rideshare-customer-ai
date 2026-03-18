export type UserRole = 'passenger' | 'driver';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  rating: number;
  totalRides: number;
  createdAt: string;
}

export interface RideRequest {
  id: string;
  passengerId: string;
  passengerName: string;
  driverId?: string;
  driverName?: string;
  pickup: {
    address: string;
    lat: number;
    lng: number;
  };
  destination: {
    address: string;
    lat: number;
    lng: number;
  };
  status: 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';
  price: number;
  distance: string;
  duration: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  color: string;
}
