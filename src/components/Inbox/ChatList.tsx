import React from 'react';
import { Conversation } from '@shared/types';
import { getPlatformIcon } from '@/constants';
import { Search } from 'lucide-react';

interface ChatListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

const ChatList: React.FC<ChatListProps> = ({ conversations, activeId, onSelect }) => {
  return (
    <div className="flex flex-col h-full border-r border-border bg-card w-full md:w-80 lg:w-96">
      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-bold text-foreground mb-4">Mensagens</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cliente ou imóvel..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-lg focus:bg-card focus:ring-2 focus:ring-primary focus:outline-none transition-all text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
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
                <span className="font-semibold text-foreground truncate max-w-[140px]">
                  {conv.contactName}
                </span>
                {conv.unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400">
                {conv.lastMessageTime.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
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
        ))}
      </div>
    </div>
  );
};

export default ChatList;
