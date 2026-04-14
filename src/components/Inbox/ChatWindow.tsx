import React, { useState, useEffect, useRef } from 'react';
import { Conversation, Property } from '@shared/types';
import { getPlatformIcon } from '@/constants';
import {
  Send,
  Paperclip,
  Sparkles,
  Loader2,
  MoreVertical,
  Bot,
  MapPin,
  ExternalLink,
  X,
  Zap,
  Mic,
  Play,
  Pause,
  Lock,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { apiService } from '@/services/apiService';
import {
  suggestReply,
  summarizeConversation,
  askLocationAssistant,
  GroundingSource,
  fastAgentResponse,
} from '@/services/aiService';
import { useToast } from '@/contexts/ToastContext';

interface ChatWindowProps {
  conversation: Conversation | null;
  onSendMessage: (text: string, isPrivate?: boolean) => void;
  onStatusChange?: (status: 'bot' | 'open' | 'resolved') => void;
}

const AudioPlayerBubble: React.FC<{ duration: string }> = ({ duration }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="flex items-center gap-3 min-w-[160px]">
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="w-8 h-8 rounded-full bg-slate-200 text-muted-foreground flex items-center justify-center hover:bg-slate-300 transition-colors"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1">
        <div className="h-1 bg-slate-300 rounded-full w-full overflow-hidden">
          <div
            className={`h-full bg-slate-500 ${isPlaying ? 'w-2/3' : 'w-0'} transition-all duration-1000`}
          ></div>
        </div>
      </div>
      <span className="text-xs font-mono text-muted-foreground">{duration}</span>
    </div>
  );
};

const ChatWindow: React.FC<ChatWindowProps> = ({ conversation, onSendMessage, onStatusChange }) => {
  const { addToast } = useToast();
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [groundingSources, setGroundingSources] = useState<GroundingSource[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [propertyContext, setPropertyContext] = useState<Property | null>(null);
  const [sendAsPrivate, setSendAsPrivate] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    // Reset state when conversation changes
    setSummary(null);
    setGroundingSources([]);
    setInputText('');
    setPropertyContext(null);

    if (conversation) {
      // Auto-generate summary for conversations with > 3 messages
      if (conversation.messages.length > 2 && !conversation.aiSummary) {
        generateSummary();
      }

      // Fetch associated property details from the API
      if (conversation.associatedPropertyId) {
        apiService.getPropertyById(conversation.associatedPropertyId).then(setPropertyContext);
      }
    }
  }, [conversation?.id]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  const generateSummary = async () => {
    if (!conversation) return;
    setLoadingSummary(true);
    const msgs = conversation.messages.map((m) => ({
      sender: m.isStaff ? 'Corretor' : 'Cliente',
      text: m.text,
    }));
    const res = await summarizeConversation(msgs);
    setSummary(res);
    setLoadingSummary(false);
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20 flex-col text-muted-foreground p-8 text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <Sparkles className="w-10 h-10 text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Central de Atendimento</h3>
        <p className="max-w-md">
          Selecione uma conversa ao lado para iniciar. Nossa IA está pronta para ajudar a fechar
          negócios mais rápido.
        </p>
      </div>
    );
  }

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText, sendAsPrivate);
    setInputText('');
    setSendAsPrivate(false);
    setGroundingSources([]); // Clear sources after sending
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      onSendMessage('� [�udio - 0:15]');
    } else {
      setIsRecording(true);
    }
  };

  const handleAiAssist = async (tone: 'formal' | 'friendly') => {
    if (!conversation) return;
    setIsGenerating(true);
    setGroundingSources([]);
    const history = conversation.messages.map((m) => `${m.isStaff ? 'Eu' : 'Cliente'}: ${m.text}`);

    let pContext = '';
    if (propertyContext) {
      pContext = `Imóvel: ${propertyContext.title}. Preço: R$ ${propertyContext.price}. Local: ${propertyContext.location}. Detalhes: ${propertyContext.features.join(', ')}.`;
    }

    const suggestion = await suggestReply(history, tone, pContext);
    setInputText(suggestion);
    setIsGenerating(false);
  };

  const handleFastAgent = async () => {
    if (!conversation) return;
    setIsGenerating(true);
    setGroundingSources([]);

    const lastMsg = conversation.messages[conversation.messages.length - 1];
    const profileContext = conversation.clientProfile?.summary || 'Cliente interessado em imóveis';

    const response = await fastAgentResponse(
      lastMsg.text,
      conversation.contactName,
      profileContext,
      conversation.id, // Using conversation ID as the session ID
    );

    setInputText(response);
    setIsGenerating(false);
  };

  const handleLocationExplore = async () => {
    if (!propertyContext) {
      addToast('warning', 'Associe um imóvel a esta conversa para usar a busca por localização.');
      return;
    }
    setIsGenerating(true);
    setGroundingSources([]);

    const query = 'Escolas, Parques e Restaurantes bem avaliados';
    const result = await askLocationAssistant(propertyContext.location, query);

    setInputText(result.text);
    setGroundingSources(result.sources);
    setIsGenerating(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-muted/30 h-full">
      {/* Header */}
      <div className="h-16 bg-card border-b border-border px-6 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <img
            src={conversation.contactAvatar}
            alt={conversation.contactName}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-offset-1 ring-gray-200"
          />
          <div>
            <h3 className="font-bold text-foreground leading-tight">{conversation.contactName}</h3>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="bg-gray-100 p-0.5 rounded">
                {getPlatformIcon(conversation.platform)}
              </span>
              <span>{conversation.platform}</span>
              {propertyContext && (
                <span className="text-primary font-medium ml-1">
                  � Interessado em: {propertyContext.title.substring(0, 20)}...
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conversation.status === 'bot' ? (
            <button
              onClick={() => onStatusChange?.('open')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
            >
              <UserCheck className="w-4 h-4" /> Assumir Conversa
            </button>
          ) : conversation.status === 'open' ? (
            <button
              onClick={() => onStatusChange?.('resolved')}
              className="bg-slate-700 hover:bg-slate-600 text-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" /> Finalizar
            </button>
          ) : null}

          <button className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
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
              <div className="flex items-center gap-2 text-sm text-primary">
                <Loader2 className="w-3 h-3 animate-spin" /> Analisando histórico da conversa...
              </div>
            ) : (
              <p className="text-sm text-slate-700 leading-relaxed italic">"{summary}"</p>
            )}
          </div>
        )}

        {conversation.messages.map((msg) => {
          const isNote = msg.type === 'private_note';
          return (
            <div key={msg.id} className={`flex ${msg.isStaff ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] md:max-w-[60%] rounded-2xl px-4 py-3 shadow-sm relative group ${
                  isNote
                    ? 'bg-yellow-100 text-yellow-900 border border-yellow-200 w-full max-w-none text-center italic mx-8'
                    : msg.isStaff
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-card text-foreground rounded-bl-none border border-border'
                }`}
              >
                {isNote && (
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-yellow-700 mb-1 uppercase tracking-tight">
                    <Lock size={10} /> Nota Interna (Staff Online)
                  </div>
                )}
                {msg.type === 'audio' ? (
                  <AudioPlayerBubble duration={msg.audioDuration || '0:00'} />
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                )}

                <span
                  className={`text-[10px] block mt-1 text-right opacity-70 ${
                    isNote ? 'text-yellow-600' : msg.isStaff ? 'text-blue-100' : 'text-gray-400'
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-card p-4 border-t border-border">
        {/* Grounding Sources Display */}
        {groundingSources.length > 0 && (
          <div className="mb-3 bg-muted/50 p-3 rounded-lg border border-border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Fontes do Google Maps
              </span>
              <button
                onClick={() => setGroundingSources([])}
                className="text-gray-400 hover:text-red-500"
              >
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
                  className="flex items-center gap-1 text-xs bg-white border border-gray-200 px-2 py-1 rounded-md text-primary hover:bg-blue-50 hover:border-blue-200 transition-colors"
                >
                  {source.title} <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* AI Actions */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-xs font-semibold text-gray-400 flex items-center px-2">
            IA Sugere:
          </span>

          <button
            onClick={handleFastAgent}
            disabled={isGenerating}
            className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-yellow-50 to-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-full hover:shadow-md transition-all whitespace-nowrap font-bold"
          >
            {isGenerating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Zap className="w-3 h-3 fill-current" />
            )}
            Flash Agent (Lite)
          </button>

          {propertyContext && (
            <button
              onClick={handleLocationExplore}
              disabled={isGenerating}
              className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors whitespace-nowrap"
            >
              {isGenerating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <MapPin className="w-3 h-3" />
              )}
              Explorar Região
            </button>
          )}

          <button
            onClick={() => handleAiAssist('friendly')}
            disabled={isGenerating || sendAsPrivate}
            className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors whitespace-nowrap disabled:opacity-30"
          >
            Amigável
          </button>

          <div className="flex-1"></div>

          <button
            onClick={() => setSendAsPrivate(!sendAsPrivate)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all font-bold ${
              sendAsPrivate
                ? 'bg-yellow-500 text-white shadow-inner'
                : 'bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100'
            }`}
          >
            <Lock className="w-3 h-3" />{' '}
            {sendAsPrivate ? 'Nota Privada Ativada' : 'Modo Nota Interna'}
          </button>
        </div>

        <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-xl border border-border focus-within:ring-2 focus-within:ring-primary focus-within:bg-card transition-all">
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={
              isGenerating
                ? 'Agente Flash está escrevendo...'
                : isRecording
                  ? 'Gravando áudio...'
                  : 'Digite sua mensagem...'
            }
            disabled={isGenerating || isRecording}
            className={`flex-1 bg-transparent focus:outline-none text-slate-700 placeholder-gray-400 ${isRecording ? 'animate-pulse text-red-500 font-medium' : ''}`}
          />

          {/* Botão de Audio / Send */}
          {inputText.trim() ? (
            <button
              onClick={handleSend}
              disabled={isGenerating}
              className="p-2 rounded-lg bg-primary text-white hover:bg-primary/90 shadow-md transition-all duration-200"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={toggleRecording}
              className={`p-2 rounded-lg transition-all duration-200 ${isRecording ? 'bg-red-500 text-white shadow-md scale-110' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {isRecording ? (
                <div className="w-2 h-2 bg-white rounded animate-spin" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
