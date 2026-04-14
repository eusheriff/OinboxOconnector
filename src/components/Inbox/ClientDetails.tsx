import React, { useEffect, useState } from 'react';
import { Conversation, Property, ClientProfile, ClientDocument } from '@shared/types';
import { MOCK_PROPERTIES } from '@/constants';
import {
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  User,
  Calendar,
  BrainCircuit,
  Loader2,
  Tag,
  FileText,
  Upload,
  Check,
  AlertCircle,
  Eye,
  Mic,
  StopCircle,
} from 'lucide-react';
import { analyzeClientProfile, processVoiceNote } from '@/services/aiService';

interface ClientDetailsProps {
  conversation: Conversation | null;
}

const ClientDetails: React.FC<ClientDetailsProps> = ({ conversation }) => {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'docs'>('info');

  // Voice Note States
  const [isRecordingVoiceNote, setIsRecordingVoiceNote] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceNoteResult, setVoiceNoteResult] = useState<{
    summary: string;
    actionItem: string;
    budgetUpdate?: string;
  } | null>(null);

  // Mock Documents State
  const [documents, setDocuments] = useState<ClientDocument[]>([
    { id: 'd1', name: 'CNH / RG', type: 'image', status: 'approved', uploadedAt: new Date() },
    { id: 'd2', name: 'Comprovante Renda', type: 'pdf', status: 'pending', uploadedAt: new Date() },
  ]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (conversation && !conversation.clientProfile) {
        setLoadingProfile(true);
        const msgs = conversation.messages.map((m) => ({
          sender: m.isStaff ? 'Corretor' : 'Cliente',
          text: m.text,
        }));
        const result = await analyzeClientProfile(msgs);
        setProfile(result as unknown as ClientProfile | null);
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
    ? MOCK_PROPERTIES.find((p) => p.id === conversation.associatedPropertyId)
    : null;

  const handleFileUpload = () => {
    const newDoc: ClientDocument = {
      id: Date.now().toString(),
      name: 'Novo Documento.pdf',
      type: 'pdf',
      status: 'pending',
      uploadedAt: new Date(),
    };
    setDocuments([...documents, newDoc]);
  };

  const handleVoiceNoteClick = async () => {
    if (isRecordingVoiceNote) {
      // Stop Recording & Process
      setIsRecordingVoiceNote(false);
      setVoiceProcessing(true);

      // Simulating transcription of the recorded audio
      const simulatedTranscription =
        'O cliente visitou o imóvel hoje e gostou muito da área de lazer, mas achou o preço um pouco alto. Ele disse que o orçamento máximo é 900 mil. Fiquei de enviar outras opções no centro.';

      setTimeout(async () => {
        const insights = (await processVoiceNote(simulatedTranscription)) as {
          summary: string;
          actionItem: string;
          budgetUpdate?: string;
        };
        setVoiceNoteResult(insights);
        setVoiceProcessing(false);
        // Update Profile locally with insights
        // Update Profile locally with insights
        if (insights?.budgetUpdate && profile) {
          setProfile({ ...profile, budget: insights.budgetUpdate });
        }
      }, 2000);
    } else {
      // Start Recording
      setIsRecordingVoiceNote(true);
      setVoiceNoteResult(null);
    }
  };

  return (
    <div className="w-80 border-l border-gray-200 bg-white hidden xl:flex flex-col overflow-y-auto">
      <div className="p-6 border-b border-gray-100 flex flex-col items-center text-center">
        <img
          src={conversation.contactAvatar}
          alt={conversation.contactName}
          className="w-20 h-20 rounded-full mb-3 object-cover border-4 border-blue-50"
        />
        <h2 className="text-lg font-bold text-foreground">{conversation.contactName}</h2>
        <span className="text-sm text-gray-500 mb-4">Lead Quente</span>

        <div className="flex gap-2 mb-4">
          <button className="p-2 bg-gray-100 rounded-full hover:bg-blue-50 hover:text-primary transition-colors">
            <Phone className="w-4 h-4" />
          </button>
          <button className="p-2 bg-gray-100 rounded-full hover:bg-blue-50 hover:text-primary transition-colors">
            <Mail className="w-4 h-4" />
          </button>
          <button className="p-2 bg-gray-100 rounded-full hover:bg-blue-50 hover:text-primary transition-colors">
            <Calendar className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-lg w-full">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'info' ? 'bg-white text-foreground shadow-sm' : 'text-gray-500'}`}
          >
            Perfil
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'docs' ? 'bg-white text-foreground shadow-sm' : 'text-gray-500'}`}
          >
            Documentos
          </button>
        </div>
      </div>

      {activeTab === 'info' ? (
        <>
          {/* Voice Note CRM Updater */}
          <div className="p-4 border-b border-gray-100 bg-slate-50">
            <button
              onClick={handleVoiceNoteClick}
              disabled={voiceProcessing}
              className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${isRecordingVoiceNote
                ? 'bg-red-100 text-red-600 animate-pulse'
                : 'bg-white border border-gray-200 text-slate-700 hover:border-blue-400 shadow-sm'
                }`}
            >
              {voiceProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Processando IA...
                </>
              ) : isRecordingVoiceNote ? (
                <>
                  <StopCircle className="w-4 h-4 fill-current" /> Parar Gravação
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" /> Relatório de Visita (Voz)
                </>
              )}
            </button>

            {voiceNoteResult && (
              <div className="mt-3 bg-white border border-green-200 rounded-lg p-3 text-xs animate-in fade-in slide-in-from-top-2">
                <p className="font-bold text-green-700 flex items-center gap-1 mb-2">
                  <Check className="w-3 h-3" /> CRM Atualizado!
                </p>
                <p className="text-muted-foreground mb-1">
                  <strong>Resumo:</strong> {voiceNoteResult.summary}
                </p>
                <p className="text-muted-foreground mb-1">
                  <strong>Próximo Passo:</strong> {voiceNoteResult.actionItem}
                </p>
                {voiceNoteResult.budgetUpdate && (
                  <p className="text-primary font-bold">
                    Orçamento ajustado para: {voiceNoteResult.budgetUpdate}
                  </p>
                )}
              </div>
            )}
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
                    <span className="text-xs text-purple-500 font-bold block">
                      Orçamento Estimado
                    </span>
                    <span className="text-slate-700 font-medium">{profile.budget}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <span className="text-xs text-gray-400 font-bold block">Urgência</span>
                    <span
                      className={`font-bold ${profile.urgency === 'Alta' ? 'text-red-500' : 'text-muted-foreground'}`}
                    >
                      {profile.urgency || 'Desconhecida'}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <span className="text-xs text-gray-400 font-bold block">Humor</span>
                    <span className="text-muted-foreground font-medium">
                      {profile.sentiment || 'Neutro'}
                    </span>
                  </div>
                </div>
                {profile.preferences && profile.preferences.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-400 font-bold mb-1 block">
                      Interesses Detectados:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {profile.preferences.map((pref, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-white border border-gray-200 rounded-full text-[10px] text-muted-foreground flex items-center gap-1"
                        >
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
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              Imóvel de Interesse
            </h3>

            {property ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <div className="h-32 overflow-hidden relative">
                  <img
                    src={property.image}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt={property.title}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-2 text-white font-bold">
                    R$ {property.price.toLocaleString('pt-BR')}
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="font-semibold text-sm text-foreground mb-1 line-clamp-1">
                    {property.title}
                  </h4>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{property.location}</span>
                  </div>
                  <button className="w-full text-xs flex items-center justify-center gap-1 py-1.5 border border-blue-100 text-primary rounded-md hover:bg-blue-50 font-medium transition-colors">
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
        </>
      ) : (
        <div className="flex-1 flex flex-col p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Cofre Digital
            </h3>
            <button
              onClick={handleFileUpload}
              className="text-xs flex items-center gap-1 text-primary font-bold hover:underline"
            >
              <Upload className="w-3 h-3" /> Adicionar
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded border border-gray-100 text-muted-foreground">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{doc.name}</p>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <span className="uppercase">{doc.type}</span> �{' '}
                      {doc.uploadedAt?.toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {doc.status === 'approved' ? (
                    <div title="Aprovado">
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                  ) : doc.status === 'rejected' ? (
                    <div title="Rejeitado">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    </div>
                  ) : (
                    <div className="w-2 h-2 bg-yellow-400 rounded-full" title="Pendente"></div>
                  )}
                  <button className="p-1 text-gray-300 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-700 flex gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>Todos os documentos são criptografados de ponta a ponta.</p>
          </div>
        </div>
      )}

      {activeTab === 'info' && (
        <div className="p-6 border-t border-gray-100 mt-auto">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Notas</h3>
          <textarea
            className="w-full text-sm bg-yellow-50 border-yellow-100 border rounded-lg p-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-yellow-200 min-h-[100px] resize-none"
            placeholder="Adicione notas internas sobre este cliente..."
          ></textarea>
        </div>
      )}
    </div>
  );
};

export default ClientDetails;
