
import React, { useState, useEffect, useRef } from 'react';
import { AppView, Conversation, Message, Client, Property, Platform } from './types';
import { MOCK_CONVERSATIONS, MOCK_CLIENTS, MOCK_PROPERTIES } from './constants';
import Sidebar from './components/Sidebar';
import ChatList from './components/Inbox/ChatList';
import ChatWindow from './components/Inbox/ChatWindow';
import ClientDetails from './components/Inbox/ClientDetails';
import ListingForm from './components/Listings/ListingForm';
import PropertyList from './components/Properties/PropertyList';
import ClientList from './components/Clients/ClientList';
import IntegrationsSettings from './components/Settings/IntegrationsSettings';
import PropertyMap from './components/Map/PropertyMap';
import Pipeline from './components/CRM/Pipeline';
import LandingPage from './components/Landing/LandingPage';
import LoginPage from './components/Auth/LoginPage';
import { fastAgentResponse } from './services/geminiService';
import { Smartphone, CheckCircle2 } from 'lucide-react';

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Dashboard State
  const [currentView, setCurrentView] = useState<AppView>(AppView.INBOX);
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  
  // Data Management State (Multi-tenant simulation)
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [properties, setProperties] = useState<Property[]>(MOCK_PROPERTIES);

  // Integration State (Lifted from Settings)
  const [integrationStatus, setIntegrationStatus] = useState<Record<string, 'connected' | 'disconnected' | 'loading'>>({
    whatsapp: 'disconnected',
    instagram: 'disconnected',
    email: 'connected',
    zap: 'disconnected',
    olx: 'disconnected',
    facebook_marketplace: 'disconnected'
  });

  const activeConversation = activeChatId 
    ? conversations.find(c => c.id === activeChatId) || null 
    : null;

  // --- AI AGENT AUTONOMOUS LOOP ---
  // Simula o comportamento do backend: Escuta mensagens do WhatsApp e responde automaticamente
  useEffect(() => {
    if (integrationStatus.whatsapp !== 'connected') return;

    // Intervalo para simular atividade recebida (Webhooks)
    const simulationInterval = setInterval(() => {
      // 1. Escolhe aleatoriamente uma conversa de WhatsApp para simular interação do cliente
      const whatsappConvs = conversations.filter(c => c.platform === Platform.WHATSAPP);
      if (whatsappConvs.length === 0) return;
      
      const randomConv = whatsappConvs[Math.floor(Math.random() * whatsappConvs.length)];
      
      // Apenas simula se a ultima mensagem foi do Staff (para o cliente responder) ou se faz muito tempo
      const lastMsg = randomConv.messages[randomConv.messages.length - 1];
      
      if (lastMsg.isStaff && Math.random() > 0.7) {
         // Cliente responde
         const clientMessages = [
             "Ainda está disponível?", 
             "Aceita financiamento?", 
             "Pode me mandar mais fotos?", 
             "Qual o valor do IPTU?",
             "Gostaria de agendar uma visita."
         ];
         const randomText = clientMessages[Math.floor(Math.random() * clientMessages.length)];
         
         handleIncomingMessage(randomConv.id, randomText);
         
         // IA Responde automaticamente após 3 segundos
         setTimeout(() => {
             handleAutoAgentReply(randomConv.id, randomText, randomConv.contactName);
         }, 3000);
      }

    }, 15000); // Tenta simular atividade a cada 15 segundos

    return () => clearInterval(simulationInterval);
  }, [integrationStatus.whatsapp, conversations]);


  const handleIncomingMessage = (convId: string, text: string) => {
      const newMessage: Message = {
          id: Date.now().toString(),
          senderId: 'contact',
          text: text,
          timestamp: new Date(),
          isStaff: false
      };

      setConversations(prev => prev.map(conv => {
          if (conv.id === convId) {
              return {
                  ...conv,
                  lastMessage: text,
                  lastMessageTime: new Date(),
                  unreadCount: conv.unreadCount + 1,
                  messages: [...conv.messages, newMessage]
              };
          }
          return conv;
      }));
  };

  const handleAutoAgentReply = async (convId: string, triggerText: string, clientName: string) => {
      // Chama o Gemini Lite
      const aiResponse = await fastAgentResponse(triggerText, clientName, "Cliente interessado vindo do WhatsApp");
      
      if (!aiResponse) return;

      const botMessage: Message = {
          id: Date.now().toString(),
          senderId: 'bot',
          text: `🤖 ${aiResponse}`, // Prefixo indicando bot
          timestamp: new Date(),
          isStaff: true
      };

      setConversations(prev => prev.map(conv => {
          if (conv.id === convId) {
              return {
                  ...conv,
                  lastMessage: `🤖 ${aiResponse}`,
                  lastMessageTime: new Date(),
                  unreadCount: 0, // Bot leu a mensagem
                  messages: [...conv.messages, botMessage]
              };
          }
          return conv;
      }));
  };

  // Handlers
  const handleSendMessage = (text: string) => {
    if (!activeChatId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: 'staff',
      text,
      timestamp: new Date(),
      isStaff: true
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === activeChatId) {
        return {
          ...conv,
          lastMessage: text,
          lastMessageTime: new Date(),
          messages: [...conv.messages, newMessage]
        };
      }
      return conv;
    }));
  };

  const handleNavigateToChat = (conversationId: string) => {
    setActiveChatId(conversationId);
    setCurrentView(AppView.INBOX);
  };

  const handleAddClient = (newClient: Client) => {
    setClients(prev => [newClient, ...prev]);
  };

  const handleDeleteProperty = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este imóvel?')) {
        setProperties(prev => prev.filter(p => p.id !== id));
    }
  };

  const toggleIntegration = (id: string, newStatus: 'connected' | 'disconnected' | 'loading') => {
      setIntegrationStatus(prev => ({...prev, [id]: newStatus}));
  };

  // --- ROUTING LOGIC ---

  if (!isAuthenticated) {
    if (showLogin) {
      return (
        <LoginPage 
          onLogin={() => setIsAuthenticated(true)} 
          onBack={() => setShowLogin(false)} 
        />
      );
    }
    return <LandingPage onNavigateLogin={() => setShowLogin(true)} />;
  }

  // --- DASHBOARD RENDER ---

  const renderContent = () => {
    switch (currentView) {
      case AppView.INBOX:
        return (
          <div className="flex h-screen w-full overflow-hidden">
            {/* List is hidden on mobile if chat is active, but visible on desktop */}
            <div className={`${activeChatId ? 'hidden md:flex' : 'flex'} h-full flex-shrink-0`}>
               <ChatList 
                 conversations={conversations} 
                 activeId={activeChatId} 
                 onSelect={setActiveChatId} 
               />
            </div>
            
            {/* Chat Window is visible on mobile only if active, always on desktop */}
            <div className={`${!activeChatId ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full relative`}>
               {activeChatId && (
                 <button 
                   onClick={() => setActiveChatId(null)}
                   className="md:hidden absolute top-4 left-4 z-10 bg-white p-2 rounded-full shadow-md text-sm font-bold text-gray-600"
                 >
                   ← Voltar
                 </button>
               )}
               <ChatWindow 
                 conversation={activeConversation} 
                 onSendMessage={handleSendMessage} 
               />
            </div>

            {/* Details panel only on large screens */}
            <ClientDetails conversation={activeConversation} />
          </div>
        );
      
      case AppView.CRM:
        return <Pipeline onNavigateToChat={handleNavigateToChat} />;

      case AppView.LISTINGS_FORM:
        return <ListingForm />;
      
      case AppView.MY_CLIENTS:
        return <ClientList clients={clients} onAddClient={handleAddClient} />;
        
      case AppView.MY_PROPERTIES:
        return <PropertyList 
            properties={properties} 
            onNavigateToCreate={() => setCurrentView(AppView.LISTINGS_FORM)}
            onDeleteProperty={handleDeleteProperty}
        />;

      case AppView.MAP:
        return <PropertyMap />;

      case AppView.SETTINGS:
        return <IntegrationsSettings status={integrationStatus} onStatusChange={toggleIntegration} />;
      
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-hidden flex flex-col relative">
        {/* Global Status Bar if WhatsApp Agent is Active */}
        {integrationStatus.whatsapp === 'connected' && (
            <div className="absolute top-0 left-0 right-0 bg-green-600 text-white text-[10px] py-1 px-4 flex justify-center items-center gap-2 z-[60] shadow-md">
                <Smartphone className="w-3 h-3" />
                <span className="font-bold">OConnector Agent Ativo</span>
                <span className="opacity-80">Respondendo automaticamente em +55 (22) 99236-3462</span>
                <span className="w-2 h-2 bg-white rounded-full animate-pulse ml-1"></span>
            </div>
        )}
        <div className={`flex-1 overflow-hidden flex flex-col ${integrationStatus.whatsapp === 'connected' ? 'pt-6' : ''}`}>
             {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
