
import React from 'react';
import { Platform, Conversation, Property, Deal, DealStage, Client } from './types';
import { MessageCircle, Instagram, Mail, Phone, MapPin, Home, Search } from 'lucide-react';

// Helper to render platform icons
export const getPlatformIcon = (platform: Platform) => {
  switch (platform) {
    case Platform.WHATSAPP: return <MessageCircle className="w-4 h-4 text-green-500" />;
    case Platform.INSTAGRAM: return <Instagram className="w-4 h-4 text-pink-500" />;
    case Platform.EMAIL: return <Mail className="w-4 h-4 text-blue-500" />;
    default: return <MessageCircle className="w-4 h-4 text-gray-500" />;
  }
};

export const MOCK_PROPERTIES: Property[] = [
  {
    id: 'prop-1',
    title: 'Apartamento Vista Mar - Jardins',
    price: 1250000,
    location: 'Jardins, São Paulo',
    image: 'https://picsum.photos/400/300',
    features: ['3 Quartos', '2 Suítes', 'Varanda Gourmet'],
    coordinates: { x: 40, y: 30 },
    status: 'Active'
  },
  {
    id: 'prop-2',
    title: 'Casa em Condomínio Fechado',
    price: 890000,
    location: 'Alphaville, Barueri',
    image: 'https://picsum.photos/401/300',
    features: ['4 Quartos', 'Piscina', 'Segurança 24h'],
    coordinates: { x: 65, y: 55 },
    status: 'Active'
  },
  {
    id: 'prop-3',
    title: 'Loft Industrial Centro',
    price: 450000,
    location: 'Centro, São Paulo',
    image: 'https://picsum.photos/402/300',
    features: ['Pé direito duplo', 'Próximo ao Metrô'],
    coordinates: { x: 25, y: 45 },
    status: 'Pending'
  },
  {
    id: 'prop-4',
    title: 'Cobertura Duplex',
    price: 2100000,
    location: 'Moema, São Paulo',
    image: 'https://picsum.photos/403/300',
    features: ['Jacuzzi', '4 Vagas', 'Vista 360'],
    coordinates: { x: 50, y: 20 },
    status: 'Active'
  }
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
    registeredAt: new Date(Date.now() - 100000000)
  },
  {
    id: 'c2',
    name: 'Ana Julia',
    email: 'ana.ju@email.com',
    phone: '(11) 98888-5678',
    status: 'Novo',
    budget: 'R$ 800k',
    notes: 'Interesse em casas de condomínio.',
    registeredAt: new Date(Date.now() - 50000000)
  },
  {
    id: 'c3',
    name: 'Carlos Empreendimentos',
    email: 'contato@carlos.com',
    phone: '(11) 3000-0000',
    status: 'Fechado',
    budget: 'Indefinido',
    notes: 'Investidor recorrente.',
    registeredAt: new Date(Date.now() - 200000000)
  }
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
    associatedPropertyId: 'prop-1',
    messages: [
      { id: 'm1', senderId: 'contact', text: 'Olá, bom dia!', timestamp: new Date(Date.now() - 100000), isStaff: false },
      { id: 'm2', senderId: 'staff', text: 'Bom dia Roberto! Tudo bem?', timestamp: new Date(Date.now() - 90000), isStaff: true },
      { id: 'm3', senderId: 'contact', text: 'Gostaria de saber se o imóvel ainda está disponível para visitação neste sábado.', timestamp: new Date(), isStaff: false }
    ]
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
    associatedPropertyId: 'prop-2',
    messages: [
      { id: 'm1', senderId: 'contact', text: 'Vi esse story da casa em Alphaville.', timestamp: new Date(Date.now() - 4000000), isStaff: false },
      { id: 'm2', senderId: 'contact', text: 'Qual o valor do condomínio?', timestamp: new Date(Date.now() - 3600000), isStaff: false }
    ]
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
    messages: [
        { id: 'm1', senderId: 'contact', text: 'Segue em anexo a documentação solicitada.', timestamp: new Date(Date.now() - 86400000), isStaff: false }
    ]
  }
];

export const MOCK_DEALS: Deal[] = [
  {
    id: 'deal-1',
    conversationId: 'conv-1',
    propertyId: 'prop-1',
    value: 1250000,
    stage: DealStage.VISIT,
    probability: 60,
    lastActivity: new Date()
  },
  {
    id: 'deal-2',
    conversationId: 'conv-2',
    propertyId: 'prop-2',
    value: 890000,
    stage: DealStage.NEW,
    probability: 20,
    lastActivity: new Date(Date.now() - 86400000)
  },
  {
    id: 'deal-3',
    conversationId: 'conv-3',
    propertyId: 'prop-3',
    value: 450000,
    stage: DealStage.PROPOSAL,
    probability: 80,
    lastActivity: new Date(Date.now() - 172800000)
  }
];
