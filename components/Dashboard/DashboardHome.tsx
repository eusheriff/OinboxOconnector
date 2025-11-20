
import React from 'react';
import { Client, Deal, Property, Conversation, DealStage } from '../../types';
import { TrendingUp, Users, Building2, MessageCircle, DollarSign, ArrowUpRight, Calendar, Clock, Bot, Flame, ThermometerSun } from 'lucide-react';

interface DashboardProps {
  clients: Client[];
  deals: Deal[];
  properties: Property[];
  conversations: Conversation[];
  onNavigate: (view: any) => void;
}

const DashboardHome: React.FC<DashboardProps> = ({ clients, deals, properties, conversations, onNavigate }) => {
  // 1. Calculate Metrics
  const totalPipelineValue = deals.reduce((acc, deal) => acc + deal.value, 0);
  const activeLeadsCount = clients.filter(c => c.status === 'Novo' || c.status === 'Em Atendimento').length;
  const activePropertiesCount = properties.filter(p => p.status === 'Active').length;
  const unreadMessages = conversations.reduce((acc, conv) => acc + conv.unreadCount, 0);
  
  // Filter Hot Leads
  const hotLeads = clients.filter(c => c.temperature === 'Hot' || (c.leadScore && c.leadScore > 70));

  const StatCard = ({ title, value, subtext, icon: Icon, color, trend }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className={`font-bold ${trend >= 0 ? 'text-green-600' : 'text-red-500'} flex items-center`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingUp className="w-3 h-3 mr-1 rotate-180" />}
          {Math.abs(trend)}%
        </span>
        <span className="text-gray-400">{subtext}</span>
      </div>
    </div>
  );

  return (
    <div className="flex-1 bg-gray-50 p-8 overflow-y-auto h-full">
      <div className="max-w-7xl mx-auto">
        
        {/* Welcome Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Visão Geral</h1>
            <p className="text-gray-500">Bem-vindo de volta! Aqui está o resumo da sua imobiliária hoje.</p>
          </div>
          <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
            <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-bold text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Hoje
            </div>
            <span className="text-sm text-gray-500 pr-2">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="VGV em Pipeline" 
            value={`R$ ${(totalPipelineValue / 1000000).toFixed(1)}M`} 
            subtext="vs. mês passado"
            icon={DollarSign} 
            color="bg-blue-600" 
            trend={12.5} 
          />
          <StatCard 
            title="Leads Ativos" 
            value={activeLeadsCount} 
            subtext="novos contatos"
            icon={Users} 
            color="bg-purple-600" 
            trend={8.2} 
          />
          <StatCard 
            title="Imóveis Ativos" 
            value={activePropertiesCount} 
            subtext="disponíveis"
            icon={Building2} 
            color="bg-orange-500" 
            trend={-2.4} 
          />
          <StatCard 
            title="Mensagens" 
            value={unreadMessages} 
            subtext="não lidas"
            icon={MessageCircle} 
            color={unreadMessages > 0 ? "bg-red-500" : "bg-green-500"} 
            trend={unreadMessages > 5 ? 15 : -5} 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* HOT LEADS RADAR (NEW WIDGET) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-red-50 bg-red-50/30 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="bg-red-100 p-2 rounded-full text-red-600 animate-pulse">
                            <Flame className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Radar de Oportunidades</h3>
                            <p className="text-xs text-red-600 font-medium">Atenção Prioritária Necessária</p>
                        </div>
                    </div>
                    <span className="text-xs bg-white border border-red-100 text-red-600 px-2 py-1 rounded-full font-bold">
                        {hotLeads.length} Leads Quentes
                    </span>
                </div>
                
                <div className="p-4 space-y-3">
                    {hotLeads.length > 0 ? hotLeads.map(client => (
                        <div key={client.id} className="flex items-center justify-between p-4 rounded-xl bg-white border border-gray-100 hover:border-red-200 hover:shadow-md transition-all group cursor-pointer" onClick={() => onNavigate('MY_CLIENTS')}>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                                        {client.name.charAt(0)}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[8px] p-1 rounded-full border-2 border-white">
                                        <Flame className="w-3 h-3 fill-current" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{client.name}</h4>
                                    <p className="text-xs text-gray-500">{client.notes || 'Interesse alto detectado'}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                                <div className="text-right hidden sm:block">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Score IA</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div style={{width: `${client.leadScore || 0}%`}} className="h-full bg-gradient-to-r from-orange-400 to-red-600"></div>
                                        </div>
                                        <span className="text-sm font-bold text-red-600">{client.leadScore || 0}</span>
                                    </div>
                                </div>
                                <button className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition-colors">
                                    <MessageCircle className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-8 text-gray-400">
                            <ThermometerSun className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p>Nenhum lead quente detectado no momento.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions & Recent Leads */}
            <div className="space-y-6">
                
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4">Acesso Rápido</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => onNavigate('LISTINGS_FORM')} className="p-3 bg-blue-50 hover:bg-blue-100 rounded-xl text-blue-700 text-xs font-bold flex flex-col items-center gap-2 transition-colors">
                            <Building2 className="w-5 h-5" /> Novo Imóvel
                        </button>
                        <button onClick={() => onNavigate('MY_CLIENTS')} className="p-3 bg-purple-50 hover:bg-purple-100 rounded-xl text-purple-700 text-xs font-bold flex flex-col items-center gap-2 transition-colors">
                            <Users className="w-5 h-5" /> Cadastrar Cliente
                        </button>
                        <button onClick={() => onNavigate('CRM')} className="p-3 bg-green-50 hover:bg-green-100 rounded-xl text-green-700 text-xs font-bold flex flex-col items-center gap-2 transition-colors">
                            <DollarSign className="w-5 h-5" /> Ver Pipeline
                        </button>
                        <button onClick={() => onNavigate('AI_CONSULTANT')} className="p-3 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-indigo-700 text-xs font-bold flex flex-col items-center gap-2 transition-colors">
                            <Bot className="w-5 h-5" /> Consultor IA
                        </button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex justify-between items-center">
                        Atividade Recente
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">Hoje</span>
                    </h3>
                    <div className="space-y-4">
                        {conversations.slice(0, 3).map(conv => (
                            <div key={conv.id} className="flex items-start gap-3">
                                <img src={conv.contactAvatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">
                                        <span className="font-bold">{conv.contactName}</span> enviou mensagem
                                    </p>
                                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                        <Clock className="w-3 h-3" /> {conv.lastMessageTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
