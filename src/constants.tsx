import React from 'react';
import {
  Platform,
  Conversation,
  Property,
  Deal,
  DealStage,
  Client,
  Appointment,
  Tenant,
} from './types';
import {
  MessageCircle,
  Instagram,
  Mail,
  Send,
  Twitter,
  Music2,
  MessageSquare,
  Smartphone,
} from 'lucide-react';

// Helper to render platform icons — agora com TODOS os canais
export const getPlatformIcon = (platform: Platform | string) => {
  switch (platform) {
    case Platform.WHATSAPP:
      return <MessageCircle className="w-4 h-4 text-green-500" />;
    case Platform.INSTAGRAM:
      return <Instagram className="w-4 h-4 text-pink-500" />;
    case Platform.EMAIL:
      return <Mail className="w-4 h-4 text-blue-500" />;
    case Platform.FACEBOOK:
      return <MessageCircle className="w-4 h-4 text-blue-600" />;
    case Platform.TELEGRAM:
      return <Send className="w-4 h-4 text-[#0088CC]" />;
    case Platform.X_TWITTER:
      return <Twitter className="w-4 h-4 text-gray-800" />;
    case Platform.TIKTOK:
      return <Music2 className="w-4 h-4 text-black" />;
    case Platform.LINE:
      return <MessageSquare className="w-4 h-4 text-[#06C755]" />;
    case Platform.SMS:
      return <Smartphone className="w-4 h-4 text-yellow-600" />;
    default:
      // Suporte para strings lowercase (channel_type do backend)
      if (typeof platform === 'string') {
        const p = platform.toLowerCase();
        if (p === 'facebook') return <MessageCircle className="w-4 h-4 text-blue-600" />;
        if (p === 'instagram') return <Instagram className="w-4 h-4 text-pink-500" />;
        if (p === 'telegram') return <Send className="w-4 h-4 text-[#0088CC]" />;
        if (p === 'x') return <Twitter className="w-4 h-4 text-gray-800" />;
        if (p === 'tiktok') return <Music2 className="w-4 h-4 text-black" />;
        if (p === 'line') return <MessageSquare className="w-4 h-4 text-[#06C755]" />;
        if (p === 'whatsapp') return <MessageCircle className="w-4 h-4 text-green-500" />;
        if (p === 'email') return <Mail className="w-4 h-4 text-blue-500" />;
        if (p === 'sms') return <Smartphone className="w-4 h-4 text-yellow-600" />;
      }
      return <MessageCircle className="w-4 h-4 text-gray-500" />;
  }
};

// Label amigavel para cada canal
export const getPlatformLabel = (platform: Platform | string): string => {
  if (typeof platform === 'string') {
    const labels: Record<string, string> = {
      facebook: 'Facebook',
      instagram: 'Instagram',
      telegram: 'Telegram',
      x: 'X (Twitter)',
      tiktok: 'TikTok',
      line: 'Line',
      whatsapp: 'WhatsApp',
      email: 'Email',
      sms: 'SMS',
    };
    return labels[platform.toLowerCase()] || platform;
  }
  return platform;
};

export const OLLAMA_MODELS = [
  { id: 'llama3.1:8b', name: 'Llama 3.1 (8B)', type: 'chat' },
  { id: 'phi4:latest', name: 'Phi-4 (Microsoft)', type: 'chat' },
  { id: 'deepseek-r1:7b', name: 'DeepSeek R1 (Raciocínio)', type: 'chat' },
  { id: 'qwen2.5-coder:14b', name: 'Qwen 2.5 Coder (14B)', type: 'chat' },
  { id: 'gemma3:12b', name: 'Gemma 3 (Google)', type: 'chat' },
  { id: 'qwen3-vl:8b', name: 'Qwen 3 VL (Visão)', type: 'vision' },
  { id: 'llava:latest', name: 'LLaVA (Visão)', type: 'vision' },
  { id: 'minicpm-v:latest', name: 'MiniCPM-V (Visão Mobile)', type: 'vision' },
];

export const MOCK_TENANTS: Tenant[] = [
  {
    id: 't1',
    name: 'Imobiliária Silva & Filhos',
    ownerName: 'Roberto Silva',
    email: 'roberto@silva.com',
    plan: 'Business',
    status: 'Active',
    mrr: 399,
    usersCount: 5,
    joinedAt: new Date('2024-01-15').toISOString(),
  },
  {
    id: 't2',
    name: 'Luxury Homes SP',
    ownerName: 'Ana Beatriz',
    email: 'ana@luxury.com',
    plan: 'Enterprise',
    status: 'Active',
    mrr: 2500,
    usersCount: 25,
    joinedAt: new Date('2024-02-10').toISOString(),
  },
  {
    id: 't3',
    name: 'Corretor João',
    ownerName: 'João Pedro',
    email: 'joao@corretor.com',
    plan: 'Autônomo',
    status: 'Overdue',
    mrr: 149,
    usersCount: 1,
    joinedAt: new Date('2024-03-05').toISOString(),
  },
  {
    id: 't4',
    name: 'Mega Imóveis Sul',
    ownerName: 'Carlos Ferreira',
    email: 'carlos@megasul.com',
    plan: 'Business',
    status: 'Active',
    mrr: 399,
    usersCount: 8,
    joinedAt: new Date('2024-03-20').toISOString(),
  },
  {
    id: 't5',
    name: 'Novo Lar Consultoria',
    ownerName: 'Mariana Costa',
    email: 'mari@novolar.com',
    plan: 'Autônomo',
    status: 'Trial',
    mrr: 0,
    usersCount: 1,
    joinedAt: new Date().toISOString(),
  },
];

export const MOCK_PROPERTIES: Property[] = [
  {
    id: 'prop-1',
    title: 'Apartamento Vista Mar - Jardins',
    price: 1250000,
    location: 'Jardins, São Paulo',
    image: 'https://picsum.photos/400/300',
    features: ['3 Quartos', '2 Suítes', 'Varanda Gourmet'],
    coordinates: { x: 40, y: 30 },
    status: 'Active',
    listingType: 'sale',
  },
  {
    id: 'prop-2',
    title: 'Casa em Condomínio Fechado',
    price: 890000,
    location: 'Alphaville, Barueri',
    image: 'https://picsum.photos/401/300',
    features: ['4 Quartos', 'Piscina', 'Segurança 24h'],
    coordinates: { x: 65, y: 55 },
    status: 'Active',
    listingType: 'sale',
  },
  {
    id: 'prop-3',
    title: 'Loft Industrial Centro',
    price: 3500,
    location: 'Centro, São Paulo',
    image: 'https://picsum.photos/402/300',
    features: ['Pé direito duplo', 'Próximo ao Metrô'],
    coordinates: { x: 25, y: 45 },
    status: 'Pending',
    listingType: 'rent',
  },
  {
    id: 'prop-4',
    title: 'Cobertura Duplex',
    price: 12000,
    location: 'Moema, São Paulo',
    image: 'https://picsum.photos/403/300',
    features: ['Jacuzzi', '4 Vagas', 'Vista 360'],
    coordinates: { x: 50, y: 20 },
    status: 'Active',
    listingType: 'rent',
  },
];

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'c1',
    name: 'Roberto Silva',
    email: 'roberto@email.com',
    phone: '(11) 99999-1234',
    status: 'Em Atendimento',
    budget: 'R$ 1.2M - 1.5M',
    notes: 'Procura apto na zona sul.',
    registeredAt: new Date(Date.now() - 100000000),
    leadScore: 85,
    temperature: 'Hot',
    lastInteraction: new Date(),
  },
  {
    id: 'c2',
    name: 'Ana Julia',
    email: 'ana.ju@email.com',
    phone: '(11) 98888-5678',
    status: 'Novo',
    budget: 'R$ 800k',
    notes: 'Interesse em casas de condomínio.',
    registeredAt: new Date(Date.now() - 50000000),
    leadScore: 45,
    temperature: 'Warm',
    lastInteraction: new Date(Date.now() - 86400000),
  },
  {
    id: 'c3',
    name: 'Carlos Empreendimentos',
    email: 'contato@carlos.com',
    phone: '(11) 3000-0000',
    status: 'Fechado',
    budget: 'Indefinido',
    notes: 'Investidor recorrente.',
    registeredAt: new Date(Date.now() - 200000000),
    leadScore: 20,
    temperature: 'Cold',
    lastInteraction: new Date(Date.now() - 604800000),
  },
];

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    contactName: 'Roberto Silva',
    contactAvatar: 'https://picsum.photos/50/50?random=1',
    platform: Platform.WHATSAPP,
    lastMessage: 'Gostaria de saber se o imóvel ainda está disponível para visitação neste sábado.',
    lastMessageTime: new Date(),
    unreadCount: 1,
    tags: ['Interessado', 'Compra'],
    status: 'open',
    associatedPropertyId: 'prop-1',
    messages: [
      {
        id: 'm1',
        senderId: 'contact',
        text: 'Olá, bom dia!',
        timestamp: new Date(Date.now() - 100000),
        isStaff: false,
        type: 'text',
      },
      {
        id: 'm2',
        senderId: 'staff',
        text: 'Bom dia Roberto! Tudo bem?',
        timestamp: new Date(Date.now() - 90000),
        isStaff: true,
        type: 'text',
      },
      {
        id: 'm3',
        senderId: 'contact',
        text: 'Audio message',
        timestamp: new Date(),
        isStaff: false,
        type: 'audio',
        audioDuration: '0:24',
      },
      {
        id: 'm4',
        senderId: 'contact',
        text: 'Gostaria de saber se o imóvel ainda está disponível para visitação neste sábado.',
        timestamp: new Date(),
        isStaff: false,
        type: 'text',
      },
    ],
  },
  {
    id: 'conv-2',
    contactName: 'Ana Julia',
    contactAvatar: 'https://picsum.photos/50/50?random=2',
    platform: Platform.INSTAGRAM,
    lastMessage: 'Qual o valor do condomínio?',
    lastMessageTime: new Date(Date.now() - 3600000),
    unreadCount: 0,
    tags: ['Dúvida', 'Aluguel'],
    status: 'open',
    associatedPropertyId: 'prop-2',
    messages: [
      {
        id: 'm1',
        senderId: 'contact',
        text: 'Vi esse story da casa em Alphaville.',
        timestamp: new Date(Date.now() - 4000000),
        isStaff: false,
        type: 'text',
      },
      {
        id: 'm2',
        senderId: 'contact',
        text: 'Qual o valor do condomínio?',
        timestamp: new Date(Date.now() - 3600000),
        isStaff: false,
        type: 'text',
      },
    ],
  },
  {
    id: 'conv-3',
    contactName: 'Carlos Empreendimentos',
    contactAvatar: 'https://picsum.photos/50/50?random=3',
    platform: Platform.EMAIL,
    lastMessage: 'Segue em anexo a documentação solicitada.',
    lastMessageTime: new Date(Date.now() - 86400000),
    unreadCount: 0,
    tags: ['Parceiro', 'Documentação'],
    status: 'open',
    messages: [
      {
        id: 'm1',
        senderId: 'contact',
        text: 'Segue em anexo a documentação solicitada.',
        timestamp: new Date(Date.now() - 86400000),
        isStaff: false,
        type: 'text',
      },
    ],
  },
];

export const MOCK_DEALS: Deal[] = [
  {
    id: 'deal-1',
    conversationId: 'conv-1',
    propertyId: 'prop-1',
    value: 1250000,
    stage: DealStage.VISIT,
    probability: 60,
    lastActivity: new Date(),
  },
  {
    id: 'deal-2',
    conversationId: 'conv-2',
    propertyId: 'prop-2',
    value: 890000,
    stage: DealStage.NEW,
    probability: 20,
    lastActivity: new Date(Date.now() - 86400000),
  },
  {
    id: 'deal-3',
    conversationId: 'conv-3',
    propertyId: 'prop-3',
    value: 450000,
    stage: DealStage.PROPOSAL,
    probability: 80,
    lastActivity: new Date(Date.now() - 172800000),
  },
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-1',
    title: 'Visita - Apto Jardins',
    date: new Date(new Date().setHours(14, 30, 0, 0)), // Hoje as 14:30
    type: 'visit',
    clientName: 'Roberto Silva',
    propertyId: 'prop-1',
    location: 'Jardins, SP',
  },
  {
    id: 'apt-2',
    title: 'Assinatura Contrato',
    date: new Date(new Date().setDate(new Date().getDate() + 1)), // Amanhã
    type: 'meeting',
    clientName: 'Carlos Empreendimentos',
    location: 'Escritório Central',
  },
  {
    id: 'apt-3',
    title: 'Fotos - Casa Alphaville',
    date: new Date(new Date().setDate(new Date().getDate() + 2)), // Depois de amanhã
    type: 'visit',
    clientName: 'Proprietário Marcos',
    propertyId: 'prop-2',
    location: 'Alphaville',
  },
];
