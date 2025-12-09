
import React, { useState } from 'react';
import { MOCK_PROPERTIES, MOCK_CLIENTS } from '../../constants';
import { Property, Client, Campaign } from '../../types';
import { Megaphone, MessageCircle, Mail, Target, Sparkles, Send, CheckCircle2, Users, Loader2, Search } from 'lucide-react';

const CampaignManager: React.FC = () => {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([
      { id: 'c1', name: 'Lançamento Jardins', type: 'whatsapp', status: 'active', targetAudienceCount: 12, sentCount: 8, openRate: 65, createdAt: new Date(Date.now() - 86400000) },
      { id: 'c2', name: 'Aluguéis Centro', type: 'email', status: 'completed', targetAudienceCount: 45, sentCount: 45, openRate: 22, createdAt: new Date(Date.now() - 172800000) }
  ]);

  // Creation State
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [matchedClients, setMatchedClients] = useState<Client[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [campaignMessage, setCampaignMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const runAiMatchmaker = (property: Property) => {
      setSelectedProperty(property);
      setIsAnalyzing(true);
      setMatchedClients([]);

      // Simula IA analisando banco de dados
      setTimeout(() => {
          // Lógica Fake de Match: Pega clientes com "budget" próximo ou aleatórios
          const matches = MOCK_CLIENTS.filter((_, idx) => idx % 2 === 0 || Math.random() > 0.5).slice(0, 5);
          setMatchedClients(matches);
          setCampaignMessage(`Olá! 👋 Lembrei de você.\n\nAcabou de entrar este imóvel em *${property.location}* que é a sua cara!\n\n💰 R$ ${property.price.toLocaleString('pt-BR')}\n✨ ${property.features[0]}\n\nQuer agendar uma visita antes que seja vendido?`);
          setIsAnalyzing(false);
      }, 1500);
  };

  const handleLaunchCampaign = () => {
      setIsSending(true);
      setTimeout(() => {
          const newCampaign: Campaign = {
              id: Date.now().toString(),
              name: `Oportunidade: ${selectedProperty?.title}`,
              type: 'whatsapp',
              status: 'active',
              targetAudienceCount: matchedClients.length,
              sentCount: matchedClients.length,
              openRate: 0,
              createdAt: new Date()
          };
          setActiveCampaigns([newCampaign, ...activeCampaigns]);
          setIsSending(false);
          setView('list');
          // Reset
          setSelectedProperty(null);
          setMatchedClients([]);
      }, 2000);
  };

  const renderCreateView = () => (
      <div className="animate-in fade-in slide-in-from-right duration-300">
          <div className="flex items-center gap-2 mb-6">
             <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-foreground hover:underline">← Voltar</button>
             <h2 className="text-xl font-bold text-foreground">Nova Campanha Inteligente</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left: Property Selector */}
              <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                      <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2">
                          <Target className="w-4 h-4" /> 1. Selecione o Imóvel Alvo
                      </h3>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                          {MOCK_PROPERTIES.map(prop => (
                              <div 
                                  key={prop.id}
                                  onClick={() => runAiMatchmaker(prop)}
                                  className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all ${selectedProperty?.id === prop.id ? 'border-blue-500 bg-blue-50 ring-1 ring-primary' : 'border-gray-200 hover:bg-gray-50'}`}
                              >
                                  <img src={prop.image} className="w-16 h-16 rounded-lg object-cover" alt="" />
                                  <div>
                                      <p className="font-bold text-foreground">{prop.title}</p>
                                      <p className="text-xs text-gray-500">{prop.location}</p>
                                      <p className="text-xs font-bold text-primary mt-1">R$ {prop.price.toLocaleString('pt-BR')}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>

              {/* Right: AI Match & Compose */}
              <div className="space-y-6">
                   <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm min-h-[200px]">
                       <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2">
                           <Sparkles className="w-4 h-4 text-purple-600" /> 2. AI Matchmaker
                       </h3>

                       {!selectedProperty ? (
                           <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-center">
                               <Search className="w-8 h-8 mb-2 opacity-30" />
                               <p className="text-sm">Selecione um imóvel ao lado para a IA encontrar os compradores ideais.</p>
                           </div>
                       ) : isAnalyzing ? (
                           <div className="flex flex-col items-center justify-center h-32 text-purple-600">
                               <Loader2 className="w-8 h-8 animate-spin mb-2" />
                               <p className="text-sm font-bold">Analisando 1.450 leads...</p>
                               <p className="text-xs text-gray-400">Cruzando orçamento, localização e interesses.</p>
                           </div>
                       ) : (
                           <div className="animate-in zoom-in duration-300">
                               <div className="flex items-center justify-between mb-3">
                                   <span className="text-sm font-bold text-slate-700">Encontramos <span className="text-green-600">{matchedClients.length} Leads Quentes</span></span>
                                   <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Match: Alto</span>
                               </div>
                               <div className="flex -space-x-2 mb-4 overflow-hidden">
                                   {matchedClients.map(c => (
                                       <div key={c.id} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-bold text-muted-foreground" title={c.name}>
                                           {c.name.charAt(0)}
                                       </div>
                                   ))}
                                   <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">
                                       +
                                   </div>
                               </div>
                               
                               <div className="bg-slate-50 p-4 rounded-xl border border-gray-200">
                                   <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Mensagem (WhatsApp)</label>
                                   <textarea 
                                       value={campaignMessage}
                                       onChange={e => setCampaignMessage(e.target.value)}
                                       className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm text-slate-700 h-32 focus:ring-2 focus:ring-green-500 outline-none resize-none"
                                   ></textarea>
                                   <div className="flex justify-end mt-2">
                                       <button className="text-xs text-purple-600 font-bold hover:underline flex items-center gap-1">
                                           <Sparkles className="w-3 h-3" /> Reescrever com IA
                                       </button>
                                   </div>
                               </div>

                               <button 
                                   onClick={handleLaunchCampaign}
                                   disabled={isSending}
                                   className="w-full mt-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2"
                               >
                                   {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                   {isSending ? 'Disparando...' : 'Enviar Campanha Agora'}
                               </button>
                           </div>
                       )}
                   </div>
              </div>
          </div>
      </div>
  );

  const renderListView = () => (
      <div>
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Megaphone className="w-8 h-8 text-orange-500" /> Campanhas
                </h1>
                <p className="text-muted-foreground">Disparos individuais em massa para leads segmentados.</p>
            </div>
            <button 
                onClick={() => setView('create')}
                className="bg-background hover:bg-accent text-white px-5 py-2.5 rounded-lg font-bold shadow-lg transition-all flex items-center gap-2"
            >
                <Sparkles className="w-4 h-4 text-yellow-400" /> Nova Campanha IA
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Total Disparado (Mês)</h3>
                <p className="text-3xl font-bold text-foreground">1.240</p>
                <p className="text-xs text-green-600 font-bold mt-1 flex items-center gap-1"><Target className="w-3 h-3"/> Alta precisão</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Taxa de Abertura</h3>
                <p className="text-3xl font-bold text-foreground">68%</p>
                <p className="text-xs text-gray-500 mt-1">Média do mercado: 45%</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Vendas Geradas</h3>
                <p className="text-3xl font-bold text-foreground">R$ 2.4M</p>
                <p className="text-xs text-primary font-bold mt-1">Origem: WhatsApp</p>
            </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-700">Histórico de Campanhas</h3>
            </div>
            <div className="divide-y divide-gray-100">
                {activeCampaigns.map(camp => (
                    <div key={camp.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${camp.type === 'whatsapp' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-primary'}`}>
                                {camp.type === 'whatsapp' ? <MessageCircle className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                            </div>
                            <div>
                                <p className="font-bold text-foreground">{camp.name}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                    {camp.createdAt.toLocaleDateString()} • <Users className="w-3 h-3" /> {camp.targetAudienceCount} leads
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Status</p>
                                {camp.status === 'active' ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Enviando
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                        <CheckCircle2 className="w-3 h-3" /> Concluído
                                    </span>
                                )}
                            </div>
                            <div className="text-center hidden sm:block">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Abertura</p>
                                <p className="font-bold text-slate-700">{camp.openRate}%</p>
                            </div>
                            <button className="text-sm font-bold text-primary hover:underline">
                                Ver Relatório
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
  );

  return (
    <div className="flex-1 bg-gray-50 p-4 md:p-8 overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto h-full">
          {view === 'list' ? renderListView() : renderCreateView()}
      </div>
    </div>
  );
};

export default CampaignManager;
