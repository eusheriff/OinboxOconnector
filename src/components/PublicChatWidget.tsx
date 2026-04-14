import { useState, useEffect, useRef } from 'react';
import { Send, Bot, X, MessageCircle, RefreshCw, User } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PublicChatWidgetProps {
  title?: string;
  apiUrl?: string;
}

export function PublicChatWidget({
  title = 'Manú | Oconnector AI',
  apiUrl = 'https://hub.oconnector.tech/v1/hub/respond',
}: PublicChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize Session
  useEffect(() => {
    let sid = localStorage.getItem('Oconnector_guest_session'); // Diferente key para isolar sessão se necessário, mas pode ser compartilhado
    if (!sid) {
      sid = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      localStorage.setItem('Oconnector_guest_session', sid);
    }
    setSessionId(sid);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: userMsg.content,
          conversationHistory: messages.slice(-10),
          userInfo: {
            source: 'frontend_landing',
            id: sessionId,
            origin: window.location.origin,
            pathname: window.location.pathname,
          },
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        data?: { response: string };
        error?: string;
      };

      if (data.success && data.data) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.data?.response || '...' },
        ]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Desculpe, tive um problema de conexão. Tente novamente mais tarde.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none font-sans text-slate-800">
      {/* Chat Window */}
      <div
        className={`bg-white border border-slate-200 shadow-2xl rounded-2xl w-[350px] md:w-[380px] overflow-hidden transition-all duration-300 origin-bottom-right mb-4 pointer-events-auto ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-10 h-0'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
              <Bot className="w-5 h-5 flex-shrink-0" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">{title}</h3>
              <span className="text-[10px] opacity-90 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" />
                Online ({window.location.hostname})
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white/20 h-8 w-8 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages Area */}
        <div ref={scrollRef} className="h-[400px] overflow-y-auto p-4 space-y-4 bg-slate-50">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-4">
              <div className="bg-orange-100 p-4 rounded-full mb-3">
                <Bot className="w-8 h-8 text-orange-600" />
              </div>
              <p className="text-sm font-medium text-slate-900">Olá! Sou a Manú do Oconnector.</p>
              <p className="text-xs mt-1 max-w-[200px]">Posso ajudar com CRM e Inbox Unificado?</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-3 h-3 text-orange-600" />
                </div>
              )}

              <div
                className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-orange-600 text-white rounded-br-none'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                }`}
              >
                {msg.content}
              </div>

              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-3 h-3 text-slate-400" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start items-center gap-2 text-xs text-slate-400 ml-8">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Manú está digitando...
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-slate-100 bg-white/50 backdrop-blur-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-transparent border-slate-200 focus:ring-1 focus:ring-orange-500 rounded-md px-3 py-2 text-sm h-10 outline-none border transition-all placeholder:text-slate-400"
              disabled={loading}
            />
            <button
              type="submit"
              className="h-10 w-10 shrink-0 bg-orange-600 hover:bg-orange-700 text-white rounded-md flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !input.trim()}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="text-center mt-2">
            <p className="text-[9px] text-slate-400">
              Powered by <span className="font-bold text-orange-600">OBot Engine</span>
            </p>
          </div>
        </div>
      </div>

      {/* Toggle Button (FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`h-14 w-14 rounded-full shadow-lg shadow-orange-500/25 bg-gradient-to-r from-orange-500 to-red-600 hover:scale-110 transition-all duration-300 pointer-events-auto flex items-center justify-center text-white ${
          isOpen ? 'rotate-90 opacity-0 pointer-events-none absolute' : 'opacity-100'
        }`}
      >
        <MessageCircle className="w-7 h-7" />
      </button>

      {/* Close Button Placeholder when open (invisible but keeps layout) */}
      {isOpen && <div className="h-14 w-14" />}
    </div>
  );
}
