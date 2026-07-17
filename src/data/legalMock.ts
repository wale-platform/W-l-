import { Lawyer, LegalService, LegalRequest, DigitalAgreement } from '../types';

export const mockLegalServices: LegalService[] = [
  {
    id: 's1',
    title: 'Tenancy Agreement Drafting',
    description: 'Custom drafting of a comprehensive, legally-binding student tenancy agreement protecting your rights, clearly spelling out obligations on repairs, rent reviews, and security deposits.',
    duration: '24 Hours',
    fee: 15000
  },
  {
    id: 's2',
    title: 'Agreement Review & Verification',
    description: 'Professional legal audit of an existing lease or agreement provided by a landlord to ensure there are no unfair clauses, hidden charges, or traps.',
    duration: '12 Hours',
    fee: 10000
  },
  {
    id: 's3',
    title: 'Property Legal Verification',
    description: 'Thorough verification of the property\'s ownership, land registry status, and title deeds in Kwara State to guarantee you are renting from the legitimate owner.',
    duration: '2 Days',
    fee: 25000
  },
  {
    id: 's4',
    title: 'Dispute Resolution & Consultation',
    description: 'Legal advice and mediation between tenant and landlord regarding rent hikes, sudden eviction notices, or withholding of security deposits.',
    duration: '1 Hour (Live Session)',
    fee: 8000
  }
];

export const mockLawyers: Lawyer[] = [
  {
    id: 'law1',
    name: 'Barr. Tunde Williams',
    firm: 'Williams & Associate Chambers',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=300',
    rating: 4.9,
    reviews: 42,
    experience: 8,
    completedAgreements: 147,
    baseFee: 15000,
    specialization: 'Property & Tenancy Law',
    bio: 'Alumnus of University of Ilorin (UNILORIN). Specializes in securing tenant protections and drafting bulletproof lease agreements for students and landlords in Ilorin, Tanke, and Malete. Passionate about eliminating housing fraud in Kwara State.',
    location: 'Suite 4, Challenge Plaza, Offa Road, Ilorin',
    languages: ['English', 'Yoruba', 'Pidgin'],
    workingHours: '08:00 AM - 05:00 PM (Mon - Fri)',
    certifications: ['Member, Nigerian Bar Association (NBA)', 'Chartered Arbitrator (CIArb)', 'Kwara Property Law Association'],
    verified: true,
    phone: '+234 803 111 2222'
  },
  {
    id: 'law2',
    name: 'Barr. Elizabeth Adebayo',
    firm: 'Adebayo & Partners Legal',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300',
    rating: 4.8,
    reviews: 29,
    experience: 6,
    completedAgreements: 98,
    baseFee: 10000,
    specialization: 'Civil Litigation & Land Law',
    bio: 'Focuses heavily on student welfare rights, landlord-tenant mediation, and fast-track digital agreement approvals. Experienced in resolving housing tenancy disputes efficiently in major university clusters.',
    location: '12 University Road, Adjacent UNILORIN Second Gate, Tanke, Ilorin',
    languages: ['English', 'Yoruba', 'Igbo'],
    workingHours: '09:00 AM - 06:00 PM (Mon - Sat)',
    certifications: ['Member, Nigerian Bar Association (NBA)', 'Institute of Chartered Secretaries & Administrators'],
    verified: true,
    phone: '+234 812 333 4444'
  },
  {
    id: 'law3',
    name: 'Barr. Chidi Okafor',
    firm: 'Okafor Legal Advisory',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
    rating: 4.7,
    reviews: 35,
    experience: 10,
    completedAgreements: 185,
    baseFee: 20000,
    specialization: 'Real Estate Transaction Advisory',
    bio: 'Dedicated real estate attorney helping property investors and student renters build legal structures of trust. Offering fast-tracked digital signing and secure property deed verification.',
    location: 'Ahmadu Bello Way, GRA, Ilorin, Kwara State',
    languages: ['English', 'Igbo', 'Hausa'],
    workingHours: '08:30 AM - 05:30 PM (Mon - Fri)',
    certifications: ['Member, Nigerian Bar Association (NBA)', 'Certified Real Estate Broker (Nigeria)', 'International Bar Association'],
    verified: true,
    phone: '+234 905 555 6666'
  }
];

export const mockLegalRequests: LegalRequest[] = [
  {
    id: 'req1',
    tenantId: 't1',
    tenantName: 'Ibn Marzuk',
    landlordId: 'l1',
    landlordName: 'Alhaji Kareem Properties',
    propertyId: 'p1',
    propertyName: 'Premium Studio Apartment at Tanke',
    lawyerId: 'law1',
    serviceType: 'Tenancy Agreement Drafting',
    status: 'Agreement Drafted',
    date: '2026-07-20',
    time: '11:00 AM',
    feePaid: 15000,
    paymentMethod: 'Card',
    paymentReceipt: 'WALE-REC-90184',
    agreementId: 'agr1'
  },
  {
    id: 'req2',
    tenantId: 't1',
    tenantName: 'Ibn Marzuk',
    landlordId: 'l2',
    landlordName: 'Mrs. Fatima Bello',
    propertyId: 'p2',
    propertyName: 'Modern 1-Bedroom Flat near KWASU',
    lawyerId: 'law2',
    serviceType: 'Agreement Review & Verification',
    status: 'Consultation Scheduled',
    date: '2026-07-22',
    time: '02:30 PM',
    feePaid: 10000,
    paymentMethod: 'Wallet',
    paymentReceipt: 'WALE-REC-88402'
  }
];

export const mockDigitalAgreements: DigitalAgreement[] = [
  {
    id: 'agr1',
    requestId: 'req1',
    tenantName: 'Ibn Marzuk',
    tenantSignature: 'Ibn Marzuk (Signed)',
    landlordName: 'Alhaji Kareem Properties',
    landlordSignature: 'Alhaji Kareem (Signed)',
    lawyerName: 'Barr. Tunde Williams',
    lawyerSignature: 'Barr. Tunde Williams, Esq. (Authorized)',
    propertyName: 'Premium Studio Apartment at Tanke',
    propertyLocation: 'Tanke, Ilorin, Kwara State',
    rentAmount: 250000,
    duration: '1 Year (Renewable)',
    clauses: [
      'The Tenant shall pay the rent of ₦250,000 annually in advance.',
      'The Landlord agrees to maintain the structural integrity of the property, including borehole water systems and prepaid electricity connection.',
      'The Tenant agrees to maintain the interior of the premises in clean, tenantable conditions, normal wear-and-tear excepted.',
      'Sudden rent increments are strictly prohibited during the active tenancy period. Any review requires 3 months\' written legal notice drafted by WALE.',
      'Refund of security deposit must be completed within 14 days of lease termination, subject to inspection and verification by the legal partner.'
    ],
    signedAt: '2026-07-17',
    qrCode: 'WALE-AGR-VERIFIED-77A91'
  }
];
