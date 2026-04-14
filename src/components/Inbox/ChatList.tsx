import React, { useState, useMemo } from 'react';
import { Conversation } from '@shared/types';
import { getPlatformIcon, getPlatformLabel } from '@/constants';
import { Search, Bot, User, CheckCircle2, Filter, X } from 'lucide-react';

// Canais sociais disponiveis para filtro
const SOCIAL_CHANNELS = [
  { value: 'all', label: 'Todos' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'line', label: 'Line' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
];

interface ChatListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

const ChatList: React.FC<ChatListProps> = ({ conversations, activeId, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filtrar conversas por busca e canal
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      // Filtro por canal
      const platformValue = (conv.platform || '').toLowerCase();
      if (channelFilter !== 'all' && platformValue !== channelFilter) {
        return false;
      }

      // Filtro por busca
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          conv.contactName?.toLowerCase().includes(q) ||
          conv.lastMessage?.toLowerCase().includes(q) ||
          getPlatformLabel(conv.platform).toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [conversations, searchQuery, channelFilter]);

  // Contar conversas por canal
  const channelCounts = useMemo(() => {
    const counts: Record<string, number> = { all: conversations.length };
    conversations.forEach((conv) => {
      const p = (conv.platform || '').toLowerCase();
      counts[p] = (counts[p] || 0) + 1;
    });
    return counts;
  }, [conversations]);

  // Contar nao lidas total
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <div className="flex flex-col h-full border-r border-border bg-card w-full md:w-80 lg:w-96">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-foreground">Mensagens</h2>
          {totalUnread > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {totalUnread}
            </span>
          )}
        </div>

        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cliente ou canal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-lg focus:bg-card focus:ring-2 focus:ring-primary focus:outline-none transition-all text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${
              channelFilter !== 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-3 h-3" />
            Filtros
          </button>
          {channelFilter !== 'all' && (
            <button
              onClick={() => setChannelFilter('all')}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
            >
              <X className="w-3 h-3" />
              Limpar
            </button>
          )}
        </div>

        {showFilters && (
          <div className="flex gap-1 flex-wrap mt-2">
            {SOCIAL_CHANNELS.map((ch) => (
              <button
                key={ch.value}
                onClick={() => {
                  setChannelFilter(ch.value);
                  setShowFilters(false);
                }}
                className={`text-[10px] px-2 py-1 rounded-md font-medium transition-colors ${
                  channelFilter === ch.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {ch.label}
                {channelCounts[ch.value] !== undefined && (
                  <span className="ml-1 opacity-60">({channelCounts[ch.value]})</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {conversations.length === 0 ? 'Nenhuma conversa ainda' : 'Nenhuma conversa encontrada'}
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${
                activeId === conv.id
                  ? 'bg-blue-50 border-l-4 border-l-blue-600'
                  : 'border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground truncate max-w-[120px]">
                    {conv.contactName}
                  </span>

                  {/* Status Badge */}
                  {conv.status === 'bot' ? (
                    <span className="bg-blue-100 text-blue-600 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 uppercase">
                      <Bot size={10} /> IA
                    </span>
                  ) : conv.status === 'open' ? (
                    <span className="bg-emerald-100 text-emerald-600 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 uppercase">
                      <User size={10} /> Humano
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-500 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 uppercase">
                      <CheckCircle2 size={10} /> Resolvido
                    </span>
                  )}

                  {conv.unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {conv.lastMessageTime?.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }) || '--:--'}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 bg-gray-100 rounded-full">{getPlatformIcon(conv.platform)}</div>
                <p className="text-sm text-gray-500 truncate flex-1">{conv.lastMessage}</p>
              </div>

              <div className="flex gap-1 flex-wrap">
                {conv.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] bg-slate-100 text-foreground px-2 py-1 rounded-md font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatList;
