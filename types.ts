
export enum Platform {
  WHATSAPP = 'Whatsapp',
  INSTAGRAM = 'Instagram',
  EMAIL = 'Email',
  FACEBOOK = 'Facebook',
  OLX = 'OLX',
  ZAP = 'Zap Imóveis',
  PORTAL_IMOVEL = 'Portal Imóvel'
}

export type AIProvider = 'gemini' | 'ollama';

export interface AIConfig {
  provider: AIProvider;
  ollamaBaseUrl: string;
  selectedModel: string; // Modelo de texto padrão
  visionModel: string;   // Modelo para imagens (ex: llava, qwen3-vl)
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  role?: 'admin' | 'client'; // Novo
}

export interface Tenant {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  plan: 'Autônomo' | 'Business' | 'Enterprise';
  status: 'Active' | 'Overdue' | 'Trial';
  mrr: number;
  usersCount: number;
  joinedAt: Date;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  isStaff: boolean;
  type?: 'text' | 'audio';
  audioDuration?: string;
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
  CLOSED = 'Fechado'
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
  // Views do Super Admin
  SUPER_ADMIN_OVERVIEW = 'SUPER_ADMIN_OVERVIEW',
  SUPER_ADMIN_TENANTS = 'SUPER_ADMIN_TENANTS',
  SUPER_ADMIN_FINANCE = 'SUPER_ADMIN_FINANCE'
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