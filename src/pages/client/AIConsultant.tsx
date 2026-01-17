import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Loader2 } from 'lucide-react';
import { apiService } from '../../services/apiService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIConsultant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! Sou seu consultor jurídico e de mercado imobiliário. Como posso ajudar hoje?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Call backend API
      await apiService.getHeaders(); // Just to check auth, actual call below
      // Simulating API call since the real endpoint might need specific payload structure
      // In a real app: const data = await apiService.chatWithAI(input);

      // Mock response for now as per plan
      setTimeout(() => {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Entendi sua dúvida sobre "${userMsg.content}". Como consultor IA, recomendo verificar a legislação local e as taxas de juros atuais (Selic). Posso ajudar a redigir uma cláusula contratual se desejar.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Consultor IA</h1>
        <p className="text-gray-600">Especialista em Direito Imobiliário e Tendências de Mercado</p>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 flex gap-3 ${
                  msg.role === 'user' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="mt-1">
                  {msg.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
                </div>
                <div>
                  <p className="text-sm">{msg.content}</p>
                  <span className="text-[10px] opacity-70 mt-1 block">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3 flex gap-2 items-center text-gray-500">
                <Bot size={16} />
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Digitando...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-gray-100 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Pergunte sobre contratos, taxas ou leis..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-primary text-white p-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
