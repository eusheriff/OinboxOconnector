export enum Platform {
  WHATSAPP = 'Whatsapp',
  INSTAGRAM = 'Instagram',
  EMAIL = 'Email',
  FACEBOOK = 'Facebook',
  OLX = 'OLX',
  ZAP = 'Zap Imóveis',
  PORTAL_IMOVEL = 'Portal Imóvel',
}

export type AIProvider = 'gemini' | 'ollama';

export interface AIConfig {
  provider: AIProvider;
  ollamaBaseUrl: string;
  selectedModel: string; // Modelo de texto padrão
  visionModel: string; // Modelo para imagens (ex: llava, qwen3-vl)
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  role?: 'admin' | 'client' | 'SuperAdmin' | 'user'; // Alinhado com backend permissions.ts
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
  mrr: number; // calculated field
  usersCount: number; // calculated field
}

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
  // Novos campos para Lead Scoring
  leadScore?: number; // 0 a 100
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

export interface Property {
  id: string;
  title: string;
  price: number;
  location: string;
  image: string;
  features: string[];
  coordinates?: {
    x: number;
    y: number;
  };
  status?: 'Active' | 'Sold' | 'Pending';
  listingType: 'sale' | 'rent';
}

export enum DealStage {
  NEW = 'Novo Lead',
  VISIT = 'Visita Agendada',
  PROPOSAL = 'Proposta Enviada',
  CLOSED = 'Fechado',
}

export interface Deal {
  id: string;
  conversationId: string;
  propertyId: string;
  value: number;
  stage: DealStage;
  probability: number;
  lastActivity: Date;
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

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  INBOX = 'INBOX',
  LISTINGS_FORM = 'LISTINGS_FORM',
  MY_PROPERTIES = 'MY_PROPERTIES',
  MY_CLIENTS = 'MY_CLIENTS',
  MAP = 'MAP',
  CRM = 'CRM',
  CALENDAR = 'CALENDAR',
  SETTINGS = 'SETTINGS',
  AI_CONSULTANT = 'AI_CONSULTANT',
  CALCULATOR = 'CALCULATOR',
  MARKETING = 'MARKETING',
  CAMPAIGNS = 'CAMPAIGNS',
  CONTRACTS = 'CONTRACTS',
  WHATSAPP = 'WHATSAPP',
  // Views do Super Admin
  SUPER_ADMIN_OVERVIEW = 'SUPER_ADMIN_OVERVIEW',
  SUPER_ADMIN_TENANTS = 'SUPER_ADMIN_TENANTS',
  SUPER_ADMIN_FINANCE = 'SUPER_ADMIN_FINANCE',
  // Novas views - Lead Capture Engine
  SUPER_ADMIN_LEADS = 'SUPER_ADMIN_LEADS',
  SUPER_ADMIN_GOOGLE_PLACES = 'SUPER_ADMIN_GOOGLE_PLACES',
  SUPER_ADMIN_QUALIFICATION = 'SUPER_ADMIN_QUALIFICATION',
  SUPER_ADMIN_WHATSAPP_BOT = 'SUPER_ADMIN_WHATSAPP_BOT',
  SUPER_ADMIN_CAMPAIGNS = 'SUPER_ADMIN_CAMPAIGNS',
  SUPER_ADMIN_INBOX = 'SUPER_ADMIN_INBOX',
  SUPER_ADMIN_ANALYTICS = 'SUPER_ADMIN_ANALYTICS',
  SUPER_ADMIN_SETTINGS = 'SUPER_ADMIN_SETTINGS',
  SUPER_ADMIN_USERS = 'SUPER_ADMIN_USERS',
  // Enterprise Features
  SUPER_ADMIN_BUYER_LEADS = 'SUPER_ADMIN_BUYER_LEADS',
  // Tenant Enterprise
  ENTERPRISE_BUYER_LEADS = 'ENTERPRISE_BUYER_LEADS',
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export interface MarketingTemplate {
  id: string;
  name: string;
  format: 'story' | 'post';
  label: string;
  color: string;
}

// Lead Capture Types
export interface Lead {
  id: string;
  googlePlaceId?: string;
  name: string;
  type: 'imobiliaria' | 'corretor' | 'construtora';
  avatar?: string;
  permissions?: string[];
  tenantId?: string;
  plan?: string;
  trialEndsAt?: string;
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

// Outreach Campaign (Lead Capture Engine - diferente de Campaign para marketing)
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

