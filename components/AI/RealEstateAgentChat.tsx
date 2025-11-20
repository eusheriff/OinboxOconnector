
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Briefcase, TrendingUp, FileText, AlertCircle } from 'lucide-react';
import { askMarketExpert } from '../../services/geminiService';

const RealEstateAgentChat: React.FC = () => {
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: 'Olá! Sou o Consultor OConnector. Como posso ajudar você no mercado imobiliário hoje? Fale comigo sobre tendências, investimentos ou burocracia.' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const starterQuestions = [
    { icon: TrendingUp, text: "Como está o mercado para comprar agora?" },
    { icon: FileText, text: "Quais documentos preciso para financiar?" },
    { icon: Briefcase, text: "Vale a pena investir em imóveis para alugar?" },
    { icon: AlertCircle, text: "Dicas para avaliar um imóvel usado" }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text: string = inputText) => {
    if (!text.trim()) return;

    const userMsg = text;
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsThinking(true);

    const response = await askMarketExpert(userMsg, messages);
    
    setMessages(prev => [...prev, { role: 'model', text: response }]);
    setIsThinking(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6 shadow-sm flex items-center gap-4">
        <div className="bg-indigo-600 p-3 rounded-xl text-white shadow-lg shadow-indigo-200">
            <Bot className="w-8 h-8" />
        </div>
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Consultor de Mercado IA</h1>
            <p className="text-slate-500 text-sm">Tire dúvidas técnicas, jurídicas e de investimento com nossa IA especialista.</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Welcome / Starters */}
            {messages.length === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {starterQuestions.map((q, idx) => (
                        <button 
                            key={idx}
                            onClick={() => handleSend(q.text)}
                            className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-400 hover:shadow-md transition-all text-left group"
                        >
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <q.icon className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-900">{q.text}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Messages List */}
            {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 border border-indigo-200">
                            <Bot className="w-5 h-5 text-indigo-700" />
                        </div>
                    )}
                    
                    <div className={`max-w-[80%] rounded-2xl p-5 shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user' 
                            ? 'bg-slate-800 text-white rounded-br-none' 
                            : 'bg-white text-slate-800 border border-gray-100 rounded-bl-none'
                    }`}>
                        {msg.text}
                    </div>

                    {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-slate-600" />
                        </div>
                    )}
                </div>
            ))}

            {isThinking && (
                <div className="flex gap-4 justify-start">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center gap-3">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                        <span className="text-sm text-gray-500">Analisando dados de mercado...</span>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4 md:p-6">
        <div className="max-w-4xl mx-auto relative">
            <div className="flex gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white transition-all shadow-sm">
                <input 
                    type="text"
                    className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-2 text-slate-800 placeholder-gray-400"
                    placeholder="Pergunte sobre financiamento, bairros ou documentação..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    disabled={isThinking}
                />
                <button 
                    onClick={() => handleSend()}
                    disabled={!inputText.trim() || isThinking}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
            <p className="text-center text-xs text-gray-400 mt-3">
                A IA pode cometer erros. Sempre consulte um advogado ou contador para decisões finais.
            </p>
        </div>
      </div>
    </div>
  );
};

export default RealEstateAgentChat;
