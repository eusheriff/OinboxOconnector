
import React, { useState, useEffect, useRef } from 'react';
import { AppView, Conversation, Message, Client, Property, Platform, ToastNotification, Deal } from './types';
import { MOCK_CONVERSATIONS, MOCK_CLIENTS, MOCK_PROPERTIES, MOCK_DEALS } from './constants';
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
import RegisterPage from './components/Auth/RegisterPage'; // Re-importado
import RealEstateAgentChat from './components/AI/RealEstateAgentChat';
import DashboardHome from './components/Dashboard/DashboardHome';
import ToastContainer from './components/UI/ToastContainer';
import CalendarView from './components/Calendar/CalendarView';
import FinancialCalculator from './components/Tools/FinancialCalculator';
import MarketingStudio from './components/Marketing/MarketingStudio'; 
import CampaignManager from './components/Marketing/CampaignManager'; 
import ContractGenerator from './components/Tools/ContractGenerator'; 
import SuperAdminDashboard from './components/Admin/SuperAdminDashboard';
import { fastAgentResponse } from './services/geminiService';
import { apiService } from './services/apiService'; 
import { Smartphone, CheckCircle2 } from 'lucide-react';

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState<'none' | 'login' | 'register'>('none');
  const [userRole, setUserRole] = useState<'client' | 'admin'>('client');
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(undefined);

  // Dashboard State
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  
  // Data Management State
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [properties, setProperties] = useState<Property[]>(MOCK_PROPERTIES);
  const [deals, setDeals] = useState<Deal[]>(MOCK_DEALS);
  
  // Toast System
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Integration State
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

  // --- FETCH INITIAL DATA FROM BACKEND ---
  useEffect(() => {
    if (isAuthenticated && userRole === 'client') {
        const fetchData = async () => {
            try {
                // Tenta buscar do backend real
                const dbClients = await apiService.getClients();
                if (dbClients.length > 0) setClients(dbClients);

                const dbProperties = await apiService.getProperties();
                if (dbProperties.length > 0) setProperties(dbProperties);
                
                // Stats do dashboard podem ser carregados aqui também
            } catch (e) {
                console.log("Usando dados mockados (Backend não disponível)");
            }
        };
        fetchData();
    }
  }, [isAuthenticated, userRole]);

  // --- TOAST HELPER ---
  const addToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- AI AGENT AUTONOMOUS LOOP ---
  useEffect(() => {
    if (integrationStatus.whatsapp !== 'connected' || userRole === 'admin') return;

    const simulationInterval = setInterval(() => {
      const whatsappConvs = conversations.filter(c => c.platform === Platform.WHATSAPP);
      if (whatsappConvs.length === 0) return;
      
      const randomConv = whatsappConvs[Math.floor(Math.random() * whatsappConvs.length)];
      const lastMsg = randomConv.messages[randomConv.messages.length - 1];
      
      if (lastMsg.isStaff && Math.random() > 0.7) {
         const clientMessages = [
             "Ainda está disponível?", "Aceita financiamento?", "Pode me mandar mais fotos?", "Qual o valor do IPTU?", "Gostaria de agendar uma visita."
         ];
         const randomText = clientMessages[Math.floor(Math.random() * clientMessages.length)];
         handleIncomingMessage(randomConv.id, randomText);
         setTimeout(() => {
             handleAutoAgentReply(randomConv.id, randomText, randomConv.contactName);
         }, 3000);
      }
    }, 15000);

    return () => clearInterval(simulationInterval);
  }, [integrationStatus.whatsapp, conversations, userRole]);


  const handleIncomingMessage = (convId: string, text: string) => {
      const newMessage: Message = {
          id: Date.now().toString(),
          senderId: 'contact',
          text: text,
          timestamp: new Date(),
          isStaff: false,
          type: 'text'
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
      
      addToast('info', `Nova mensagem recebida.`);
  };

  const handleAutoAgentReply = async (convId: string, triggerText: string, clientName: string) => {
      const aiResponse = await fastAgentResponse(triggerText, clientName, "Cliente interessado vindo do WhatsApp");
      if (!aiResponse) return;

      const botMessage: Message = {
          id: Date.now().toString(),
          senderId: 'bot',
          text: `🤖 ${aiResponse}`,
          timestamp: new Date(),
          isStaff: true,
          type: 'text'
      };

      setConversations(prev => prev.map(conv => {
          if (conv.id === convId) {
              return {
                  ...conv,
                  lastMessage: `🤖 ${aiResponse}`,
                  lastMessageTime: new Date(),
                  unreadCount: 0,
                  messages: [...conv.messages, botMessage]
              };
          }
          return conv;
      }));
  };

  const handleSendMessage = (text: string) => {
    if (!activeChatId) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: 'staff',
      text,
      timestamp: new Date(),
      isStaff: true,
      type: 'text'
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

  const handleAddClient = async (newClient: Client) => {
    setClients(prev => [newClient, ...prev]);
    addToast('success', `Cliente ${newClient.name} cadastrado com sucesso!`);
    try {
        await apiService.createClient(newClient);
    } catch (e) {
        console.error("Erro ao salvar no backend", e);
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este imóvel?')) {
        setProperties(prev => prev.filter(p => p.id !== id));
        addToast('success', 'Imóvel removido com sucesso.');
        try {
            await apiService.deleteProperty(id);
        } catch(e) {
            console.error("Erro ao deletar no backend", e);
        }
    }
  };

  const toggleIntegration = (id: string, newStatus: 'connected' | 'disconnected' | 'loading') => {
      setIntegrationStatus(prev => ({...prev, [id]: newStatus}));
      if (newStatus === 'connected') {
          addToast('success', 'Canal conectado com sucesso!');
      } else if (newStatus === 'disconnected') {
          addToast('info', 'Canal desconectado.');
      }
  };

  const handleLogin = async (email: string, pass: string) => {
      try {
          // Chama o serviço de API com as credenciais digitadas pelo usuário
          const response = await apiService.login(email, pass);
          
          if (response.tenantId) {
              localStorage.setItem('oconnector_tenant_id', response.tenantId);
          }
          
          // Define o papel baseado na resposta do backend (admin ou client)
          const role = response.user?.role || 'client';
          
          setUserRole(role);
          setIsAuthenticated(true);
          addToast('success', role === 'admin' ? 'Acesso Super Admin Concedido' : 'Bem-vindo ao OConnector!');
      } catch (error) {
          addToast('error', 'Falha no login. Verifique suas credenciais.');
          throw error; // Re-throw para que o LoginPage saiba que falhou
      }
  }
  
  const handleLogout = () => {
      setIsAuthenticated(false);
      setAuthView('none');
      setUserRole('client');
      localStorage.removeItem('oconnector_tenant_id');
  }

  // --- ROUTING LOGIC ---

  if (!isAuthenticated) {
    if (authView === 'login') {
      return (
        <LoginPage 
          onLogin={handleLogin} 
          onBack={() => setAuthView('none')} 
          onRegisterClick={() => setAuthView('register')}
        />
      );
    }
    if (authView === 'register') {
        return (
            <RegisterPage 
                onSwitchToLogin={() => setAuthView('login')}
                selectedPlan={selectedPlan}
            />
        );
    }
    return <LandingPage 
        onNavigateLogin={() => setAuthView('login')} 
        onNavigateRegister={(planName) => {
            setSelectedPlan(planName);
            setAuthView('register');
        }}
    />;
  }

  // --- SUPER ADMIN VIEW ---
  if (userRole === 'admin') {
      return <SuperAdminDashboard onLogout={handleLogout} />;
  }

  // --- CLIENT DASHBOARD RENDER ---
  const renderContent = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <DashboardHome 
            clients={clients} 
            deals={deals} 
            properties={properties} 
            conversations={conversations}
            onNavigate={setCurrentView}
        />;
        
      case AppView.CALENDAR: 
        return <CalendarView />;

      case AppView.CALCULATOR:
        return <FinancialCalculator />;

      case AppView.MARKETING:
        return <MarketingStudio />;

      case AppView.CAMPAIGNS: 
        return <CampaignManager />;

      case AppView.CONTRACTS:
        return <ContractGenerator />;

      case AppView.INBOX:
        return (
          <div className="flex h-screen w-full overflow-hidden">
            <div className={`${activeChatId ? 'hidden md:flex' : 'flex'} h-full flex-shrink-0`}>
               <ChatList 
                 conversations={conversations} 
                 activeId={activeChatId} 
                 onSelect={setActiveChatId} 
               />
            </div>
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

      case AppView.AI_CONSULTANT:
        return <RealEstateAgentChat />;

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
        
        {/* Toast Container Overlay */}
        <ToastContainer toasts={toasts} removeToast={removeToast} />

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
