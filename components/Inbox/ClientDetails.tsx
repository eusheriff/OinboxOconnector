import React, { useEffect, useState } from 'react';
import { Conversation, Property, ClientProfile } from '../../types';
import { MOCK_PROPERTIES } from '../../constants';
import { Phone, Mail, MapPin, ExternalLink, User, Calendar, BrainCircuit, Loader2, Tag } from 'lucide-react';
import { analyzeClientProfile } from '../../services/geminiService';

interface ClientDetailsProps {
  conversation: Conversation | null;
}

const ClientDetails: React.FC<ClientDetailsProps> = ({ conversation }) => {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
        if (conversation && !conversation.clientProfile) {
            setLoadingProfile(true);
            const msgs = conversation.messages.map(m => ({
                sender: m.isStaff ? 'Corretor' : 'Cliente',
                text: m.text
            }));
            const result = await analyzeClientProfile(msgs);
            setProfile(result);
            setLoadingProfile(false);
        } else if (conversation?.clientProfile) {
            setProfile(conversation.clientProfile);
        } else {
            setProfile(null);
        }
    };
    fetchProfile();
  }, [conversation?.id]);

  if (!conversation) return null;

  const property = conversation.associatedPropertyId 
    ? MOCK_PROPERTIES.find(p => p.id === conversation.associatedPropertyId)
    : null;

  return (
    <div className="w-80 border-l border-gray-200 bg-white hidden xl:flex flex-col overflow-y-auto">
      <div className="p-6 border-b border-gray-100 flex flex-col items-center text-center">
        <img 
          src={conversation.contactAvatar} 
          alt={conversation.contactName} 
          className="w-20 h-20 rounded-full mb-3 object-cover border-4 border-blue-50"
        />
        <h2 className="text-lg font-bold text-slate-800">{conversation.contactName}</h2>
        <span className="text-sm text-gray-500 mb-4">Lead Quente</span>
        
        <div className="flex gap-2">
            <button className="p-2 bg-gray-100 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors">
                <Phone className="w-4 h-4" />
            </button>
            <button className="p-2 bg-gray-100 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors">
                <Mail className="w-4 h-4" />
            </button>
            <button className="p-2 bg-gray-100 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors">
                <Calendar className="w-4 h-4" />
            </button>
        </div>
      </div>

      {/* AI Agent Profile Card */}
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-3 flex items-center gap-1">
            <BrainCircuit className="w-3 h-3" /> Perfil Comportamental (IA)
        </h3>
        
        {loadingProfile ? (
            <div className="flex items-center justify-center py-4 text-purple-500 gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin" /> Aprendendo sobre o cliente...
            </div>
        ) : profile ? (
            <div className="space-y-3 text-sm">
                {profile.budget && (
                    <div className="bg-purple-50 p-2 rounded-lg border border-purple-100">
                        <span className="text-xs text-purple-500 font-bold block">Orçamento Estimado</span>
                        <span className="text-slate-700 font-medium">{profile.budget}</span>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 p-2 rounded-lg">
                         <span className="text-xs text-gray-400 font-bold block">Urgência</span>
                         <span className={`font-bold ${profile.urgency === 'Alta' ? 'text-red-500' : 'text-slate-600'}`}>
                            {profile.urgency || 'Desconhecida'}
                         </span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg">
                         <span className="text-xs text-gray-400 font-bold block">Humor</span>
                         <span className="text-slate-600 font-medium">{profile.sentiment || 'Neutro'}</span>
                    </div>
                </div>
                {profile.preferences && profile.preferences.length > 0 && (
                    <div>
                        <span className="text-xs text-gray-400 font-bold mb-1 block">Interesses Detectados:</span>
                        <div className="flex flex-wrap gap-1">
                            {profile.preferences.map((pref, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-white border border-gray-200 rounded-full text-[10px] text-slate-600 flex items-center gap-1">
                                    <Tag className="w-2 h-2" /> {pref}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        ) : (
            <div className="text-xs text-gray-400 italic text-center">
                Sem dados suficientes para análise.
            </div>
        )}
      </div>

      <div className="p-6">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Imóvel de Interesse</h3>
        
        {property ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <div className="h-32 overflow-hidden relative">
              <img src={property.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={property.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-2 left-2 text-white font-bold">
                R$ {property.price.toLocaleString('pt-BR')}
              </div>
            </div>
            <div className="p-3">
              <h4 className="font-semibold text-sm text-slate-800 mb-1 line-clamp-1">{property.title}</h4>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{property.location}</span>
              </div>
              <button className="w-full text-xs flex items-center justify-center gap-1 py-1.5 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-50 font-medium transition-colors">
                Ver Detalhes <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
            <div className="text-sm text-gray-400 text-center py-4 border-2 border-dashed border-gray-100 rounded-lg">
                Nenhum imóvel vinculado
            </div>
        )}
      </div>
      
      <div className="p-6 border-t border-gray-100">
         <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Notas</h3>
         <textarea 
            className="w-full text-sm bg-yellow-50 border-yellow-100 border rounded-lg p-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-yellow-200 min-h-[100px] resize-none"
            placeholder="Adicione notas internas sobre este cliente..."
         ></textarea>
      </div>
    </div>
  );
};

export default ClientDetails;