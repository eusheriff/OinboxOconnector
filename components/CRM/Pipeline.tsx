import React, { useState } from 'react';
import { Deal, DealStage, AppView } from '../../types';
import { MOCK_CONVERSATIONS, MOCK_PROPERTIES, MOCK_DEALS, getPlatformIcon } from '../../constants';
import { MoreHorizontal, Plus, DollarSign, Calendar, ChevronRight, ArrowRight } from 'lucide-react';

interface PipelineProps {
  onNavigateToChat: (conversationId: string) => void;
}

const Pipeline: React.FC<PipelineProps> = ({ onNavigateToChat }) => {
  const [deals, setDeals] = useState<Deal[]>(MOCK_DEALS);

  // Configuração das Colunas
  const columns = [
    { id: DealStage.NEW, label: 'Novos Leads', color: 'border-blue-500', bg: 'bg-blue-50' },
    { id: DealStage.VISIT, label: 'Visitas', color: 'border-yellow-500', bg: 'bg-yellow-50' },
    { id: DealStage.PROPOSAL, label: 'Propostas', color: 'border-purple-500', bg: 'bg-purple-50' },
    { id: DealStage.CLOSED, label: 'Fechados', color: 'border-green-500', bg: 'bg-green-50' },
  ];

  // Função simples para mover card (Simulando Drag & Drop)
  const moveCard = (dealId: string, currentStage: DealStage) => {
    const stages = Object.values(DealStage);
    const currentIndex = stages.indexOf(currentStage);
    const nextStage = stages[currentIndex + 1];

    if (nextStage) {
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: nextStage } : d));
    }
  };

  const calculateColumnTotal = (stage: DealStage) => {
    return deals
        .filter(d => d.stage === stage)
        .reduce((acc, curr) => acc + curr.value, 0);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 bg-card border-b border-border flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline de Vendas</h1>
          <p className="text-gray-500 text-sm">Gerencie o fluxo de negociações da imobiliária.</p>
        </div>
        <div className="flex gap-4">
            <div className="text-right">
                <span className="text-xs text-gray-500 uppercase font-bold">Total em Pipeline</span>
                <p className="text-xl font-bold text-foreground">
                    R$ {deals.reduce((acc, curr) => acc + curr.value, 0).toLocaleString('pt-BR')}
                </p>
            </div>
            <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
                <Plus className="w-4 h-4" /> Novo Negócio
            </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex h-full gap-6 min-w-[1000px]">
          {columns.map((col) => (
            <div key={col.id} className="flex-1 flex flex-col min-w-[280px] h-full">
              {/* Column Header */}
              <div className={`p-3 rounded-t-xl bg-card border-t-4 ${col.color} shadow-sm mb-2 flex justify-between items-center`}>
                <div>
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{col.label}</h3>
                    <span className="text-xs text-gray-400 font-medium">
                        {deals.filter(d => d.stage === col.id).length} leads
                    </span>
                </div>
                <div className="text-xs font-bold text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                   {calculateColumnTotal(col.id) > 0 ? 
                     `R$ ${(calculateColumnTotal(col.id) / 1000).toFixed(0)}k` : 'R$ 0'}
                </div>
              </div>

              {/* Cards Area */}
              <div className="flex-1 bg-gray-200/50 rounded-xl p-2 overflow-y-auto space-y-3">
                {deals.filter(d => d.stage === col.id).map((deal) => {
                    const conversation = MOCK_CONVERSATIONS.find(c => c.id === deal.conversationId);
                    const property = MOCK_PROPERTIES.find(p => p.id === deal.propertyId);

                    if (!conversation || !property) return null;

                    return (
                        <div key={deal.id} className="bg-card p-4 rounded-lg shadow-sm border border-border hover:shadow-md transition-all group relative">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <img src={conversation.contactAvatar} className="w-8 h-8 rounded-full" alt="" />
                                    <div>
                                        <p className="font-bold text-sm text-foreground">{conversation.contactName}</p>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                            {getPlatformIcon(conversation.platform)} 
                                            {conversation.platform}
                                        </div>
                                    </div>
                                </div>
                                <button className="text-gray-400 hover:text-gray-600">
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="mb-3">
                                <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                    <span className="font-semibold text-slate-700">Interesse:</span> 
                                    <span className="truncate">{property.title}</span>
                                </div>
                                <div className="flex items-center gap-1 font-bold text-foreground text-sm">
                                    <DollarSign className="w-3 h-3 text-green-600" />
                                    R$ {deal.value.toLocaleString('pt-BR')}
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                    <Calendar className="w-3 h-3" />
                                    Há 2 dias
                                </div>
                                
                                {col.id !== DealStage.CLOSED && (
                                    <button 
                                        onClick={() => moveCard(deal.id, col.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50 text-primary p-1.5 rounded hover:bg-blue-100"
                                        title="Avançar Etapa"
                                    >
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            
                            {/* Quick Action to Chat */}
                            <button 
                                onClick={() => onNavigateToChat(deal.conversationId)}
                                className="absolute inset-0 z-0" 
                                title="Abrir conversa"
                            />
                            {/* Increase z-index of buttons so they are clickable over the card link */}
                            <div className="relative z-10 pointer-events-none"></div> 
                        </div>
                    );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pipeline;