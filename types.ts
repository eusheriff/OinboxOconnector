
export enum Platform {
  WHATSAPP = 'Whatsapp',
  INSTAGRAM = 'Instagram',
  EMAIL = 'Email',
  FACEBOOK = 'Facebook',
  OLX = 'OLX',
  ZAP = 'Zap Imóveis',
  PORTAL_IMOVEL = 'Portal Imóvel'
}

export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  isStaff: boolean;
}

// Novo: Perfil comportamental extraído pela IA
export interface ClientProfile {
  budget?: string;
  urgency?: 'Baixa' | 'Média' | 'Alta';
  preferences?: string[];
  sentiment?: 'Positivo' | 'Neutro' | 'Crítico';
  summary?: string;
}

// Entidade Cliente dedicada para cadastro
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
}

export interface Conversation {
  id: string;
  contactName: string; // Pode ser linkado ao Client.name
  contactAvatar: string;
  platform: Platform;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  tags: string[]; // ex: "Comprador", "Aluguel", "Alto Padrão"
  messages: Message[];
  associatedPropertyId?: string;
  aiSummary?: string;
  clientProfile?: ClientProfile; // Novo: Dados do Agente Pessoal
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
}

export enum DealStage {
  NEW = 'Novo Lead',
  VISIT = 'Visita Agendada',
  PROPOSAL = 'Proposta Enviada',
  CLOSED = 'Fechado'
}

export interface Deal {
  id: string;
  conversationId: string; // Link com a conversa
  propertyId: string;     // Link com o imóvel
  value: number;
  stage: DealStage;
  probability: number; // 0-100%
  lastActivity: Date;
}

export enum AppView {
  INBOX = 'INBOX',
  LISTINGS_FORM = 'LISTINGS_FORM', // Formulário de criação
  MY_PROPERTIES = 'MY_PROPERTIES', // Lista de gestão
  MY_CLIENTS = 'MY_CLIENTS',       // Lista de gestão
  MAP = 'MAP',
  CRM = 'CRM',
  SETTINGS = 'SETTINGS'
}
