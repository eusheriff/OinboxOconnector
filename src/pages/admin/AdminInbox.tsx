import React, { useState } from 'react';
import ChatList from '../../../components/Inbox/ChatList';
import ChatWindow from '../../../components/Inbox/ChatWindow';
import { Conversation, Message, Platform } from '../../../types';

const AdminInbox: React.FC = () => {
  const [activeId, setActiveId] = useState<string | null>('1');

  // Mock Data for Admin Inbox
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1',
      contactName: 'João Silva (Tenant A)',
      contactAvatar: 'https://ui-avatars.com/api/?name=Joao+Silva',
      lastMessage: 'Preciso de ajuda com a configuração.',
      lastMessageTime: new Date(),
      unreadCount: 2,
      platform: Platform.WHATSAPP,
      tags: ['Suporte', 'Urgente'],
      messages: [
        {
          id: 'm1',
          text: 'Olá, preciso de ajuda com a configuração do meu domínio.',
          senderId: 'user',
          timestamp: new Date(Date.now() - 100000),
          isStaff: false,
          type: 'text',
        },
        {
          id: 'm2',
          text: 'Claro, João. Qual erro está aparecendo?',
          senderId: 'me',
          timestamp: new Date(),
          isStaff: true,
          type: 'text',
        },
      ],
    },
    {
      id: '2',
      contactName: 'Maria Souza (Tenant B)',
      contactAvatar: 'https://ui-avatars.com/api/?name=Maria+Souza',
      lastMessage: 'Obrigado pelo atendimento!',
      lastMessageTime: new Date(Date.now() - 3600000),
      unreadCount: 0,
      platform: Platform.INSTAGRAM,
      tags: ['Financeiro'],
      messages: [],
    },
  ]);

  const handleSendMessage = (text: string) => {
    if (!activeId) return;

    const newMessage: Message = {
      id: `m${Date.now()}`,
      text: text,
      senderId: 'me',
      timestamp: new Date(),
      isStaff: true,
      type: 'text',
    };

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === activeId) {
          return {
            ...conv,
            messages: [...conv.messages, newMessage],
            lastMessage: text,
            lastMessageTime: new Date(),
          };
        }
        return conv;
      }),
    );
  };

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  return (
    <div className="flex h-[calc(100vh-2rem)] bg-background rounded-xl overflow-hidden border border-border shadow-2xl">
      <ChatList conversations={conversations} activeId={activeId} onSelect={setActiveId} />
      <div className="flex-1 bg-card">
        {activeId ? (
          <ChatWindow conversation={activeConversation} onSendMessage={handleSendMessage} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Selecione uma conversa para iniciar o atendimento.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminInbox;
