
export enum UserRole {
  VISITOR = 'VISITOR',
  CLIENT = 'CLIENT',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN'
}

export type KYCStatus = 'none' | 'pending' | 'verified' | 'rejected';

// Supabase-ready User Structure
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  isVerified?: boolean;
  kycStatus?: KYCStatus;
  subscriptionPlan?: 'free' | 'pro' | 'business';
  phone?: string;
  location?: string;
  hasPassword?: boolean; // NEW: Pour savoir si l'utilisateur a défini un mot de passe (vs Social Login pur)
  // JSONB column in Supabase for dynamic profile data
  details?: Record<string, any>; 
}

export interface AddOn {
  id: string;
  name: string;
  price: number;
  description?: string;
}

export interface ServiceProvider {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  priceRange: string; // Display string
  priceValue: number; // Base price value for sorting/db
  priceUnit: 'event' | 'hour' | 'item'; // NEW: Unité de tarification universelle
  imageUrl: string;
  portfolio?: string[]; 
  verified: boolean;
  location: string;
  description?: string;
  // JSONB column in Supabase for specific attributes (Dynamic Attributes)
  details?: Record<string, any>; 
  
  // Standardized Offer Structure
  capacity?: string;
  cancellationPolicy?: string;
  serviceArea?: string; // NEW: Zone d'intervention
  warrantyEnabled?: boolean; // NEW: Garantie Événéo activée
  availability?: string[]; // NEW: Jours disponibles (ex: ['Lundi', 'Mardi'])
  bookedDates?: string[]; // NEW: Dates déjà prises (Format YYYY-MM-DD)
  
  includedItems?: string[]; // "Ce qui est inclus"
  excludedItems?: string[]; // "Ce qui est PAS inclus"
  addOns?: AddOn[]; // "Options Payantes"
}

export type ItemStatus = 'pending' | 'confirmed' | 'completed_by_provider' | 'validated_by_client';

export interface EventItem {
  id: string; // Unique ID for the item
  provider: ServiceProvider;
  price: number;
  status: ItemStatus; // Statut granulaire par prestation
  selectedAddOns?: string[]; // IDs of selected add-ons
  serviceStartAt?: string;
  serviceEndAt?: string;
  paidToProvider: boolean; // Si le virement a été déclenché
}

export interface Event {
  id: string;
  name: string;
  date: string;
  status: 'draft' | 'confirmed' | 'started' | 'ended' | 'completed' | 'cancelled_refunded';
  items: EventItem[];
  totalCost: number;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  avatarUrl: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: 'month' | 'year';
  features: string[];
  recommended?: boolean;
  role: UserRole;
}

export enum ChatRole {
  USER = 'user',
  MODEL = 'model'
}

export interface ChatMessage {
  role: ChatRole;
  text: string;
  timestamp: number;
}

export interface Transaction {
  id: string;
  type: 'payment' | 'deposit' | 'payout' | 'refund' | 'subscription_fee' | 'hold_fee';
  amount: number;
  currency: string;
  date: string;
  status: 'pending' | 'completed' | 'failed' | 'held' | 'released' | 'refunded' | 'disputed';
  description: string;
  referenceId?: string; // Event ID or Invoice ID
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'unpaid';
  downloadUrl: string;
}