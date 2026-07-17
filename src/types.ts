export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  distanceToUniversity: string;
  universityNearby: string;
  type: 'Apartment' | 'Studio' | 'Room' | 'Shared';
  bedrooms: number;
  bathrooms: number;
  availability: 'Available' | 'Unavailable' | 'Coming Soon';
  amenities: string[];
  images: string[];
  landlord: Landlord;
  verified: boolean;
  featured?: boolean;
}

export interface Landlord {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  reviews: number;
  verified: boolean;
  responseTime: string;
  memberSince: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'tenant' | 'landlord';
  avatar?: string;
}
