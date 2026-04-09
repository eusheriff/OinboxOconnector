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
  VIVA_REAL = 'VivaReal',
  MERCADO_LIVRE = 'Mercado Livre Imóveis',
  IMOVELWEB = 'Imovelweb',
  CHAVES_NA_MAO = 'Chaves na Mão',
  REALIZA = 'Realiza',
  FACEBOOK_MARKETPLACE = 'Facebook Marketplace',
}

// Status de publicação em portais
export enum PublicationStatus {
  PENDING = 'pending',
  PUBLISHING = 'publishing',
  PUBLISHED = 'published',
  FAILED = 'failed',
  DRAFT = 'draft',
}

// Tipo de autenticação do portal
export type PortalAuthType = 'api_key' | 'oauth' | 'credentials' | 'xml_feed' | 'webhook';

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
  role?: 'admin' | 'client' | 'SuperAdmin' | 'user' | 'super_admin';
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

export interface ClientProfile {
  budget?: string;
  urgency?: 'Baixa' | 'Média' | 'Alta';
  preferences?: string[];
  sentiment?: 'Positivo' | 'Neutro' | 'Crítico';
  summary?: string;
}

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

export interface ClientDocument {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'doc';
  status: 'pending' | 'approved' | 'rejected';
  url?: string;
  uploadedAt?: Date;
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
  images?: string[];
  features: string[];
  coordinates?: { x: number; y: number };
  status?: 'Active' | 'Sold' | 'Pending';
  listingType: 'sale' | 'rent';
  // Campos adicionais para publicação multi-plataforma
  description?: string;
  bedrooms?: number;
  bathrooms?: number;
  suites?: number;
  garage?: number;
  area?: number;
  total_area?: number;
  condo_value?: number;
  iptu_value?: number;
  portal_urls?: Record<string, string>; // portal_id -> URL
  publications?: PropertyPublication[];
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
  clientProfile?: ClientProfile;
  documents?: ClientDocument[];
}

export interface Appointment {
  id: string;
  title: string;
  date: Date;
  type: 'visit' | 'meeting' | 'call';
  clientName: string;
  propertyId?: string;
  location: string;
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

// === AI & CONFIG ===

export type AIProvider = 'openai' | 'ollama';

export interface AIConfig {
  provider: AIProvider;
  ollamaBaseUrl: string;
  selectedModel: string;
  visionModel: string;
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

// === MARKETING ===

export interface MarketingTemplate {
  id: string;
  name: string;
  format: 'story' | 'post';
  label: string;
  color: string;
}

export interface QualificationRule {
  id: string;
  name: string;
  description?: string;
  minRating: number;
  minReviews: number;
  requiredKeywords?: string[];
  excludedKeywords?: string[];
  requiredHasPhone: boolean;
  requiredHasWebsite: boolean;
  weight: number;
  isActive: boolean;
}

// === PORTALS & MULTI-PLATFORM PUBLISHING ===

export interface PortalConfig {
  id: string;
  tenant_id: string;
  portal_id: string;
  enabled: boolean;
  auth_data?: Record<string, any>; // Credenciais criptografadas
  xml_url?: string; // Para portais que usam feed XML
  webhook_url?: string; // Para portais que usam webhook
  last_sync?: string;
  created_at: string;
  updated_at: string;
}

export interface PortalInfo {
  id: string;
  name: string;
  type: 'listing' | 'social' | 'marketplace';
  icon: string;
  color: string;
  description: string;
  authType: PortalAuthType;
  authFields?: {
    label: string;
    type: string;
    placeholder: string;
    required?: boolean;
  }[];
  supported: boolean;
  requiresApproval?: boolean;
}

export interface PropertyPublication {
  id: string;
  property_id: string;
  tenant_id: string;
  portal_id: string;
  status: PublicationStatus;
  external_id?: string; // ID no portal externo
  external_url?: string; // URL do anúncio no portal
  error_message?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BulkPublishRequest {
  property_id: string;
  portal_ids: string[];
}

export interface BulkPublishResult {
  success: boolean;
  publications: PropertyPublication[];
  total: number;
  successful: number;
  failed: number;
}

export interface PortalPublishResponse {
  success: boolean;
  publication_id: string;
  status: PublicationStatus;
  external_id?: string;
  external_url?: string;
  error?: string;
}
