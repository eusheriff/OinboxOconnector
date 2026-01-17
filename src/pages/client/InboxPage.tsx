import React, { useState, useEffect } from 'react';
import ChatList from '../../../components/Inbox/ChatList';
import ChatWindow from '../../../components/Inbox/ChatWindow';
import { Conversation, Message, Platform } from '../../../types';
import { apiService } from '../../../services/apiService';
import { Loader2, MessageCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

const InboxPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchMessages = async () => {
    try {
      const data = (await apiService.getWhatsAppMessages(100)) as {
        messages: Record<string, unknown>[];
      };
      if (data.messages) {
        // Group messages by remote_jid
        interface GroupedConversation {
          id: string;
          contactName: string;
          contactAvatar: string;
          lastMessage: string;
          lastMessageTime: Date;
          unreadCount: number;
          platform: Platform;
          tags: string[];
          messages: Message[];
        }

        const grouped = data.messages.reduce(
          (acc: Record<string, GroupedConversation>, msg: unknown) => {
            const m = msg as Record<string, unknown>;
            const jid = m.remote_jid as string;
            if (!acc[jid]) {
              acc[jid] = {
                id: jid,
                contactName: jid.split('@')[0], // Default to number
                contactAvatar: `https://ui-avatars.com/api/?name=${jid.split('@')[0]}`,
                lastMessage: m.content as string,
                lastMessageTime: new Date(m.created_at as string),
                unreadCount: 0,
                platform: Platform.WHATSAPP, // Assuming WhatsApp for now
                tags: [],
                messages: [],
              };
            }
            acc[jid].messages.push({
              id: m.id as string,
              text: m.content as string,
              senderId: m.direction === 'outbound' ? 'me' : 'other',
              timestamp: new Date(m.created_at as string),
              isStaff: m.direction === 'outbound',
              type: m.media_url ? 'image' : 'text', // Simplification
              mediaUrl: m.media_url as string,
            });
            // Update last message if newer
            if (new Date(m.created_at as string) > acc[jid].lastMessageTime) {
              acc[jid].lastMessage = m.content as string;
              acc[jid].lastMessageTime = new Date(m.created_at as string);
            }
            return acc;
          },
          {},
        );

        const convList = Object.values(grouped).sort(
          (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime(),
        );

        setConversations(convList as Conversation[]);
        if (!activeId && convList.length > 0) {
          // setActiveId((convList[0] as Conversation).id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch messages', error);
      addToast('error', 'Erro ao carregar mensagens.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000); // Poll for new messages
    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!activeId) return;

    // Optimistic update
    const newMessage: Message = {
      id: `temp-${Date.now()}`,
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

    try {
      await apiService.sendWhatsAppMessage(activeId.split('@')[0], text);
      // Refresh to get real ID and status
      fetchMessages();
    } catch (error) {
      console.error('Failed to send message', error);
      addToast('error', 'Falha ao enviar mensagem.');
      // TODO: Show error toast/revert optimistic update
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  if (loading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200">
      <ChatList conversations={conversations} activeId={activeId} onSelect={setActiveId} />
      <div className="flex-1 bg-gray-50">
        {activeId ? (
          <ChatWindow conversation={activeConversation} onSendMessage={handleSendMessage} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
            <MessageCircle size={64} className="mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-600">Sua Caixa de Entrada</h3>
            <p className="max-w-md mt-2">
              Selecione uma conversa para começar a atender seus clientes com o poder da IA.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InboxPage;
