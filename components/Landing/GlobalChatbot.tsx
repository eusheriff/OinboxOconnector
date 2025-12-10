
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Loader2, Sparkles } from 'lucide-react';
import { askGlobalAgent } from '../../services/geminiService';

const GlobalChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', text: string}[]>([
    { role: 'assistant', text: 'Olá! Sou a IA do Oinbox. Posso ajudar você a entender como nossa plataforma revoluciona vendas imobiliárias com inteligência artificial?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Tenta carregar o sessionId do localStorage
    let currentSessionId = localStorage.getItem('oinbox_chatbot_session_id');
    if (!currentSessionId) {
      // Se não existir, gera um novo e salva no localStorage
      currentSessionId = crypto.randomUUID();
      localStorage.setItem('oinbox_chatbot_session_id', currentSessionId);
    }
    setSessionId(currentSessionId);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]); // Removido sessionId das dependências para evitar loop

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    const response = await askGlobalAgent(userMsg, messages, sessionId);
    
    setMessages(prev => [...prev, { role: 'assistant', text: response }]);
    setIsTyping(false);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 ${
          isOpen ? 'bg-card text-white rotate-90' : 'bg-primary text-white'
        }`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[90vw] md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-scale-in origin-bottom-right h-[500px]">
          
          {/* Header */}
          <div className="bg-background p-4 flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Oinbox AI</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Online agora
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                    msg.role === 'user' 
                      ? 'bg-primary text-white rounded-br-none' 
                      : 'bg-white text-slate-700 border border-gray-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none p-3 shadow-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
                  <span className="text-xs text-gray-400">Digitando...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 focus-within:ring-2 focus-within:ring-primary focus-within:bg-white transition-all">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Pergunte sobre o Oinbox..."
                className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder-gray-400"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="text-primary hover:text-blue-700 disabled:opacity-50"
              >
                {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
            <div className="text-[10px] text-center text-gray-400 mt-2">
              Powered by Oinbox AI
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in {
          animation: scaleIn 0.2s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default GlobalChatbot;
