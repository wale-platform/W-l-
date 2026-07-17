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
  phone?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'tenant' | 'landlord' | 'lawyer';
  avatar?: string;
  phone?: string;
}

export interface Lawyer {
  id: string;
  name: string;
  firm: string;
  avatar: string;
  rating: number;
  reviews: number;
  experience: number;
  completedAgreements: number;
  baseFee: number;
  specialization: string;
  bio: string;
  location: string;
  languages: string[];
  workingHours: string;
  certifications: string[];
  verified: boolean;
  phone?: string;
}

export interface LegalService {
  id: string;
  title: string;
  description: string;
  duration: string;
  fee: number;
}

export interface LegalRequest {
  id: string;
  tenantId: string;
  tenantName: string;
  landlordId: string;
  landlordName: string;
  propertyId: string;
  propertyName: string;
  lawyerId: string;
  serviceType: string;
  status: 'Pending' | 'Consultation Scheduled' | 'Agreement Drafted' | 'Completed';
  date: string;
  time: string;
  feePaid: number;
  paymentMethod: 'Card' | 'Bank Transfer' | 'Wallet';
  paymentReceipt?: string;
  agreementId?: string;
}

export interface DigitalAgreement {
  id: string;
  requestId: string;
  tenantName: string;
  tenantSignature?: string;
  landlordName: string;
  landlordSignature?: string;
  lawyerName: string;
  lawyerSignature?: string;
  propertyName: string;
  propertyLocation: string;
  rentAmount: number;
  duration: string;
  clauses: string[];
  signedAt?: string;
  qrCode?: string;
}

