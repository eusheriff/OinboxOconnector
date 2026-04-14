import React, { useState, useRef, useEffect } from 'react';

// Icons (Using Lucide React if available, otherwise generic SVGs)
// Assuming lucide-react is installed since it was in TecnoPubli/SavePlate. If not, I'll use SVGs.
// Checking package.json would be ideal, but for now I'll assume lucide-react or similar is standard in OConnector ecosystem.
// Actually, I'll use standard SVGs to be safe and dependency-free within the component.

const BotIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
    <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
    <path d="M10 12h4" />
    <path d="M2.29 7.62A2 2 0 0 1 4 5.22L6 4" />
    <path d="M21.71 7.62A2 2 0 0 0 20 5.22L18 4" />
  </svg>
);

const XIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const MessageIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
  </svg>
);

const SendIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const ManuWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Olá! Sou a Manú, Especialista em Omnichannel do oInbox. �\nComo posso ajudar a centralizar seu atendimento hoje?',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Get or create generic user ID
      let userId = localStorage.getItem('manu_session_id');
      if (!userId) {
        userId = 'web-' + Math.random().toString(36).substring(7);
        localStorage.setItem('manu_session_id', userId);
      }

      const response = await fetch('https://agent-hub.oconnector.tech/v1/hub/orchestrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request: userMsg.content,
          userId: userId,
          origin_domain: 'oinbox.oconnector.tech', // Forces oInbox Persona
        }),
      });

      if (!response.ok) throw new Error('Falha na comunicação');

      const data = (await response.json()) as { result?: { response?: string } };

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.result?.response || 'Desculpe, tive um problema técnico. Tente novamente.',
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error('Manu Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'system',
          content: '�� Erro de conexão. Verifique sua internet.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2 font-sans text-slate-800">
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white w-[350px] h-[500px] shadow-2xl rounded-2xl flex flex-col overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-10 fade-in duration-300">
          {/* Header */}
          <div className="bg-indigo-600 p-4 flex items-center justify-between text-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <BotIcon />
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-indigo-600"></div>
              </div>
              <div>
                <h3 className="font-bold text-sm">Manú (IA)</h3>
                <p className="text-xs text-indigo-100">Omnichannel & CRM</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/10 p-1 rounded-lg transition-colors"
            >
              <XIcon />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-600">
                    <BotIcon />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl p-3 text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : msg.role === 'system'
                        ? 'bg-red-50 text-red-600 text-xs text-center w-full border border-red-100'
                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-600">
                  <BotIcon />
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-3 shadow-sm flex items-center gap-1">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex items-center gap-2 bg-slate-50 rounded-full px-4 py-2 border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Pergunte sobre oInbox..."
                className="flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="text-indigo-600 hover:text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed p-1 transition-colors"
              >
                <SendIcon />
              </button>
            </div>
            <div className="text-center mt-2">
              <p className="text-[10px] text-slate-400">Powered by OBotOConnector Technology</p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${
          isOpen ? 'bg-slate-800 rotate-90 scale-90' : 'bg-indigo-600 hover:scale-105'
        } text-white p-4 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center hover:shadow-indigo-500/30 active:scale-95`}
      >
        {isOpen ? <XIcon /> : <MessageIcon />}
      </button>
    </div>
  );
};
