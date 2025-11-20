import React, { useState, useEffect, useRef } from 'react';
import { Conversation, Property } from '../../types';
import { MOCK_PROPERTIES } from '../../constants';
import { getPlatformIcon } from '../../constants';
import { Send, Paperclip, Sparkles, Loader2, MoreVertical, Bot, MapPin, ExternalLink, X, Zap } from 'lucide-react';
import { suggestReply, summarizeConversation, askLocationAssistant, GroundingSource, fastAgentResponse } from '../../services/geminiService';

interface ChatWindowProps {
  conversation: Conversation | null;
  onSendMessage: (text: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversation, onSendMessage }) => {
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [groundingSources, setGroundingSources] = useState<GroundingSource[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load property details if associated
  const propertyContext = conversation?.associatedPropertyId 
    ? MOCK_PROPERTIES.find(p => p.id === conversation.associatedPropertyId)
    : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setSummary(null); // Reset summary on chat change
    setGroundingSources([]); // Reset sources
    setInputText('');
    
    // Auto-generate summary for conversations with > 3 messages
    if (conversation && conversation.messages.length > 2 && !conversation.aiSummary) {
      generateSummary();
    }
  }, [conversation?.id]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  const generateSummary = async () => {
    if (!conversation) return;
    setLoadingSummary(true);
    const msgs = conversation.messages.map(m => ({
        sender: m.isStaff ? 'Corretor' : 'Cliente',
        text: m.text
    }));
    const res = await summarizeConversation(msgs);
    setSummary(res);
    setLoadingSummary(false);
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 flex-col text-gray-400 p-8 text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <Sparkles className="w-10 h-10 text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">Central de Atendimento</h3>
        <p className="max-w-md">Selecione uma conversa ao lado para iniciar. Nossa IA está pronta para ajudar a fechar negócios mais rápido.</p>
      </div>
    );
  }

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
    setGroundingSources([]); // Clear sources after sending
  };

  const handleAiAssist = async (tone: 'formal' | 'friendly') => {
    setIsGenerating(true);
    setGroundingSources([]);
    const history = conversation.messages.map(m => `${m.isStaff ? 'Eu' : 'Cliente'}: ${m.text}`);
    
    let pContext = "";
    if (propertyContext) {
        pContext = `Imóvel: ${propertyContext.title}. Preço: R$ ${propertyContext.price}. Local: ${propertyContext.location}. Detalhes: ${propertyContext.features.join(', ')}.`;
    }

    const suggestion = await suggestReply(history, tone, pContext);
    setInputText(suggestion);
    setIsGenerating(false);
  };

  const handleFastAgent = async () => {
    setIsGenerating(true);
    setGroundingSources([]);
    
    const lastMsg = conversation.messages[conversation.messages.length - 1];
    const profileContext = conversation.clientProfile?.summary || "Cliente interessado em imóveis";
    
    const response = await fastAgentResponse(
        lastMsg.text, 
        conversation.contactName, 
        profileContext
    );
    
    setInputText(response);
    setIsGenerating(false);
  }

  const handleLocationExplore = async () => {
      if (!propertyContext) {
          alert("Associe um imóvel a esta conversa para usar a busca por localização.");
          return;
      }
      setIsGenerating(true);
      setGroundingSources([]);
      
      const query = "Escolas, Parques e Restaurantes bem avaliados";
      const result = await askLocationAssistant(propertyContext.location, query);
      
      setInputText(result.text);
      setGroundingSources(result.sources);
      setIsGenerating(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F0F2F5] h-full">
      {/* Header */}
      <div className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <img src={conversation.contactAvatar} alt={conversation.contactName} className="w-10 h-10 rounded-full object-cover ring-2 ring-offset-1 ring-gray-200" />
          <div>
            <h3 className="font-bold text-slate-800 leading-tight">{conversation.contactName}</h3>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="bg-gray-100 p-0.5 rounded">{getPlatformIcon(conversation.platform)}</span>
              <span>{conversation.platform}</span>
              {propertyContext && (
                 <span className="text-blue-600 font-medium ml-1">• Interessado em: {propertyContext.title.substring(0, 20)}...</span>
              )}
            </div>
          </div>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth">
        
        {/* AI Summary Card */}
        {(summary || loadingSummary) && (
            <div className="mx-auto max-w-2xl bg-blue-50 border border-blue-100 rounded-xl p-3 mb-6 shadow-sm">
                <div className="flex items-center gap-2 mb-1 text-blue-700 font-semibold text-xs uppercase tracking-wide">
                    <Bot className="w-4 h-4" /> Resumo Inteligente
                </div>
                {loadingSummary ? (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                        <Loader2 className="w-3 h-3 animate-spin" /> Analisando histórico da conversa...
                    </div>
                ) : (
                    <p className="text-sm text-slate-700 leading-relaxed italic">"{summary}"</p>
                )}
            </div>
        )}

        {conversation.messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.isStaff ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[75%] md:max-w-[60%] rounded-2xl px-4 py-3 shadow-sm relative group ${
              msg.isStaff 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white text-slate-800 rounded-bl-none border border-gray-100'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              <span className={`text-[10px] block mt-1 text-right opacity-70 ${msg.isStaff ? 'text-blue-100' : 'text-gray-400'}`}>
                {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-4 border-t border-gray-200">
        
        {/* Grounding Sources Display */}
        {groundingSources.length > 0 && (
            <div className="mb-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Fontes do Google Maps
                    </span>
                    <button onClick={() => setGroundingSources([])} className="text-gray-400 hover:text-red-500">
                        <X className="w-3 h-3" />
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {groundingSources.map((source, idx) => (
                        <a 
                            key={idx} 
                            href={source.uri} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center gap-1 text-xs bg-white border border-gray-200 px-2 py-1 rounded-md text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                        >
                            {source.title} <ExternalLink className="w-3 h-3" />
                        </a>
                    ))}
                </div>
            </div>
        )}

        {/* AI Actions */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-xs font-semibold text-gray-400 flex items-center px-2">IA Sugere:</span>
          
          <button 
            onClick={handleFastAgent}
            disabled={isGenerating}
            className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-yellow-50 to-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-full hover:shadow-md transition-all whitespace-nowrap font-bold"
          >
            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 fill-current" />}
            Flash Agent (Lite)
          </button>

          {propertyContext && (
              <button 
                onClick={handleLocationExplore}
                disabled={isGenerating}
                className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors whitespace-nowrap"
              >
                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                Explorar Região
              </button>
          )}

          <button 
            onClick={() => handleAiAssist('friendly')}
            disabled={isGenerating}
            className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors whitespace-nowrap"
          >
            Amigável
          </button>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all">
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>
          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isGenerating ? "Agente Flash está escrevendo..." : "Digite sua mensagem..."}
            disabled={isGenerating}
            className="flex-1 bg-transparent focus:outline-none text-slate-700 placeholder-gray-400"
          />
          <button 
            onClick={handleSend}
            disabled={!inputText.trim() || isGenerating}
            className={`p-2 rounded-lg transition-all duration-200 ${
              inputText.trim() 
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;