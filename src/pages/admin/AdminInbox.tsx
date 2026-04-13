import React, { useState, useEffect } from 'react';
import ChatList from '@/components/Inbox/ChatList';
import ChatWindow from '@/components/Inbox/ChatWindow';
import { Conversation, Message } from '@shared/types';
import { apiService } from '@/services/apiService';

const AdminInbox: React.FC = () => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  // Buscar conversas do WhatsApp
  const fetchWhatsAppConversations = async (): Promise<Conversation[]> => {
    try {
      const { conversations: rawData } = await apiService.getConversations();
      return rawData.map((c: any) => ({
        id: c.id,
        contactName: c.contact_name || c.contact_id,
        contactAvatar: c.contact_avatar || `https://ui-avatars.com/api/?name=${c.contact_name || c.contact_id}`,
        platform: c.platform || 'Whatsapp',
        lastMessage: c.last_message || '',
        lastMessageTime: new Date(c.last_message_at),
        unreadCount: c.unread_count || 0,
        status: c.status,
        assignedTo: c.assigned_to,
        tags: [],
        messages: []
      }));
    } catch (e) {
      console.error('Failed to fetch WhatsApp conversations', e);
      return [];
    }
  };

  // Buscar conversas de canais sociais
  const fetchSocialConversations = async (): Promise<Conversation[]> => {
    try {
      const response = await apiService.getOmnichannelConversations();
      if (!response.success) return [];

      return response.conversations.map((c: any) => ({
        id: c.id,
        contactName: c.contact_name || c.contact_platform_id || 'Desconhecido',
        contactAvatar: c.contact_profile_pic || `https://ui-avatars.com/api/?name=${c.contact_name || 'U'}`,
        platform: c.channel_type || c.provider || 'unknown',
        lastMessage: c.last_message || '',
        lastMessageTime: new Date(c.last_message_at),
        unreadCount: c.unread_count || 0,
        status: c.status,
        assignedTo: c.assigned_to,
        tags: [],
        messages: []
      }));
    } catch (e) {
      console.error('Failed to fetch social conversations', e);
      return [];
    }
  };

  const fetchConversations = async () => {
    try {
      const [whatsAppConvs, socialConvs] = await Promise.all([
        fetchWhatsAppConversations(),
        fetchSocialConversations(),
      ]);

      // Merge e ordenar por ultima mensagem
      const allConvs = [...whatsAppConvs, ...socialConvs].sort(
        (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime()
      );

      setConversations(allConvs);
    } catch (e) {
      console.error('Failed to fetch conversations', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchMessages = async (convId: string) => {
    try {
      // Determinar qual API usar baseado na conversa ativa
      const conv = conversations.find(c => c.id === convId);
      const isWhatsApp = conv?.platform?.toLowerCase() === 'whatsapp' || conv?.platform?.toLowerCase() === 'whatsapp';

      let rawMsgs: any[] = [];

      if (isWhatsApp) {
        const response = await apiService.getConversationMessages(convId);
        rawMsgs = response.messages || [];
      } else {
        const response = await apiService.getOmnichannelMessages(convId);
        rawMsgs = response.messages || [];
      }

      const mappedMsgs: Message[] = rawMsgs.map((m: any) => ({
        id: m.id,
        senderId: m.sender_id || 'me',
        text: m.content,
        timestamp: new Date(m.created_at),
        isStaff: m.sender_type === 'bot' || m.sender_type === 'agent',
        type: m.message_type === 'private_note' ? 'private_note' : m.message_type,
        mediaUrl: m.media_url,
        isPrivate: m.message_type === 'private_note',
        direction: m.direction
      }));

      setConversations(prev => prev.map(c =>
        c.id === convId ? { ...c, messages: mappedMsgs } : c
      ));
    } catch (e) {
      console.error('Failed to fetch messages', e);
    }
  };

  useEffect(() => {
    if (activeId) {
      fetchMessages(activeId);
    }
  }, [activeId]);

  const handleSendMessage = async (text: string, isPrivate = false) => {
    if (!activeId) return;
    const activeConv = conversations.find(c => c.id === activeId);
    if (!activeConv) return;

    try {
      const isWhatsApp = activeConv.platform?.toLowerCase() === 'whatsapp';

      if (isWhatsApp) {
        await apiService.sendWhatsAppMessage(
          activeConv.id || activeConv.contactName,
          text,
          undefined,
          undefined,
          isPrivate
        );
      } else {
        await apiService.sendOmnichannelMessage(activeId, text);
      }

      fetchMessages(activeId);
      fetchConversations();
    } catch (e) {
      console.error('Failed to send message', e);
    }
  };

  const handleStatusChange = async (status: 'bot' | 'open' | 'resolved') => {
    if (!activeId) return;
    try {
      const activeConv = conversations.find(c => c.id === activeId);
      const isWhatsApp = activeConv?.platform?.toLowerCase() === 'whatsapp';

      if (isWhatsApp) {
        await apiService.updateConversationStatus(activeId, status);
      } else {
        await apiService.updateOmnichannelStatus(activeId, status);
      }

      fetchConversations();
    } catch (e) {
      console.error('Failed to update status', e);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  return (
    <div className="flex h-[calc(100vh-2rem)] bg-background rounded-xl overflow-hidden border border-border shadow-2xl">
      <ChatList conversations={conversations} activeId={activeId} onSelect={setActiveId} />
      <div className="flex-1 bg-card">
        {activeId ? (
          <ChatWindow
            conversation={activeConversation}
            onSendMessage={handleSendMessage}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            {loading ? 'Carregando conversas...' : 'Selecione uma conversa para iniciar o atendimento.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminInbox;
