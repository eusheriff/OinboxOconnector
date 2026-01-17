/**
 * SHARED TYPES - Oinbox Platform
 * 
 * These types are shared between Frontend and Backend.
 * Import from '@/shared/types' (frontend) or '../../../shared/types' (backend)
 */

// === ENUMS ===

export enum Platform {
  WHATSAPP = 'Whatsapp',
  INSTAGRAM = 'Instagram',
  EMAIL = 'Email',
  FACEBOOK = 'Facebook',
  OLX = 'OLX',
  ZAP = 'Zap Imóveis',
  PORTAL_IMOVEL = 'Portal Imóvel',
}

export enum DealStage {
  NEW = 'Novo Lead',
  VISIT = 'Visita Agendada',
  PROPOSAL = 'Proposta Enviada',
  CLOSED = 'Fechado',
}

// === USER & TENANT ===

export interface User {
  id: string;
  name: string;
  avatar: string;
  role?: 'admin' | 'client' | 'SuperAdmin' | 'user';
}

export interface Tenant {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone?: string;
  plan: string;
  status: 'Active' | 'Inactive' | 'Suspended' | 'Trial' | 'Overdue';
  joinedAt: string;
  trialEndsAt?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  mrr: number;
  usersCount: number;
}

// === CLIENT & LEAD ===

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  status: 'Novo' | 'Em Atendimento' | 'Proposta' | 'Fechado';
  budget?: string;
  notes?: string;
  registeredAt: Date;
  leadScore?: number;
  temperature?: 'Cold' | 'Warm' | 'Hot';
  lastInteraction?: Date;
  aiSummary?: string;
}

export interface Lead {
  id: string;
  googlePlaceId?: string;
  name: string;
  type: 'imobiliaria' | 'corretor' | 'construtora';
  avatar?: string;
  tenantId?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  rating?: number;
  reviewsCount: number;
  score: number;
  scoreBreakdown?: Record<string, number>;
  status: 'new' | 'qualified' | 'contacted' | 'responded' | 'converted' | 'rejected';
  source: string;
  searchQuery?: string;
  capturedAt: Date;
  qualifiedAt?: Date;
  contactedAt?: Date;
  respondedAt?: Date;
  convertedAt?: Date;
  whatsappStatus?: string;
  lastMessageAt?: Date;
  notes?: string;
  assignedTo?: string;
}

// === PROPERTY ===

export interface Property {
  id: string;
  title: string;
  price: number;
  location: string;
  image: string;
  features: string[];
  coordinates?: { x: number; y: number };
  status?: 'Active' | 'Sold' | 'Pending';
  listingType: 'sale' | 'rent';
}

// === MESSAGING ===

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  isStaff: boolean;
  type?: 'text' | 'audio' | 'image' | 'video' | 'document';
  audioDuration?: string;
  mediaUrl?: string;
}

export interface Conversation {
  id: string;
  contactName: string;
  contactAvatar: string;
  platform: Platform;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  tags: string[];
  messages: Message[];
  associatedPropertyId?: string;
  aiSummary?: string;
}

// === DEALS ===

export interface Deal {
  id: string;
  conversationId: string;
  propertyId: string;
  value: number;
  stage: DealStage;
  probability: number;
  lastActivity: Date;
}

// === CAMPAIGNS ===

export interface Campaign {
  id: string;
  name: string;
  type: 'whatsapp' | 'email';
  status: 'draft' | 'active' | 'completed';
  propertyId?: string;
  targetAudienceCount: number;
  sentCount: number;
  openRate: number;
  createdAt: Date;
}

export interface OutreachCampaign {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  type: 'whatsapp' | 'email';
  messageTemplate: string;
  variables?: string[];
  targetStatus: string;
  minScore: number;
  maxScore: number;
  totalLeads: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  repliedCount: number;
  failedCount: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// === API RESPONSES ===

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
