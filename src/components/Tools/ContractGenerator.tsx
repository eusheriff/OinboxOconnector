import React, { useState } from 'react';
import { MOCK_CLIENTS, MOCK_PROPERTIES } from '../../constants';
import { Client, Property } from '../../types';
import { FileText, Download, PenTool, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const ContractGenerator: React.FC = () => {
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [contractType, setContractType] = useState<'sale' | 'rent'>('sale');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setGenerated(true);
    }, 2000);
  };

  const reset = () => {
    setStep(1);
    setSelectedClient(null);
    setSelectedProperty(null);
    setGenerated(false);
  };

  return (
    <div className="flex-1 bg-gray-50 p-4 md:p-8 overflow-y-auto h-full">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" /> Gerador de Contratos
          </h1>
          <p className="text-muted-foreground">
            Crie minutas jurídicas personalizadas em segundos. Selecione as partes e a IA cuida do
            resto.
          </p>
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center justify-between mb-8 px-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  step >= s ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s}
              </div>
              <span
                className={`text-sm font-medium ${step >= s ? 'text-foreground' : 'text-gray-400'}`}
              >
                {s === 1 ? 'Partes' : s === 2 ? 'Revisão' : 'Download'}
              </span>
              {s < 3 && <div className="w-12 h-0.5 bg-gray-200 mx-2 hidden md:block"></div>}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
          {/* STEP 1: SELECTION */}
          {step === 1 && (
            <div className="p-8 animate-in fade-in slide-in-from-right duration-300">
              <h2 className="text-lg font-bold text-foreground mb-6">Selecione os envolvidos</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Client Select */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">
                    Comprador / Locatário
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {MOCK_CLIENTS.map((client) => (
                      <div
                        key={client.id}
                        onClick={() => setSelectedClient(client)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                          selectedClient?.id === client.id
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-primary'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-muted-foreground">
                          {client.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground">{client.name}</p>
                          <p className="text-xs text-gray-500">{client.email}</p>
                        </div>
                        {selectedClient?.id === client.id && (
                          <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Property Select */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">
                    Imóvel Objeto
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {MOCK_PROPERTIES.map((prop) => (
                      <div
                        key={prop.id}
                        onClick={() => setSelectedProperty(prop)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                          selectedProperty?.id === prop.id
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-primary'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <img
                          src={prop.image}
                          className="w-10 h-10 rounded-lg object-cover"
                          alt=""
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-foreground truncate">{prop.title}</p>
                          <p className="text-xs text-gray-500 truncate">{prop.location}</p>
                        </div>
                        {selectedProperty?.id === prop.id && (
                          <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      className="w-4 h-4 text-primary"
                      checked={contractType === 'sale'}
                      onChange={() => setContractType('sale')}
                    />
                    <span className="text-sm font-medium text-slate-700">Compra e Venda</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      className="w-4 h-4 text-primary"
                      checked={contractType === 'rent'}
                      onChange={() => setContractType('rent')}
                    />
                    <span className="text-sm font-medium text-slate-700">Locação</span>
                  </label>
                </div>
                <button
                  disabled={!selectedClient || !selectedProperty}
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 bg-background text-white rounded-lg font-bold hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                  Próximo <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: REVIEW & GENERATE */}
          {step === 2 && (
            <div className="p-8 animate-in fade-in slide-in-from-right duration-300 flex flex-col h-full">
              <h2 className="text-lg font-bold text-foreground mb-6">Resumo da Minuta</h2>

              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-sm text-muted-foreground font-mono leading-relaxed mb-6 flex-1 overflow-y-auto max-h-[300px]">
                <p className="mb-4 font-bold text-center uppercase underline">
                  CONTRATO PARTICULAR DE{' '}
                  {contractType === 'sale'
                    ? 'COMPROMISSO DE COMPRA E VENDA'
                    : 'LOCAÇÃO RESIDENCIAL'}
                </p>
                <p className="mb-2">
                  <strong>VENDEDOR/LOCADOR:</strong> Euimob Imóveis Ltda, CNPJ 00.000.000/0001-00...
                </p>
                <p className="mb-2">
                  <strong>COMPRADOR/LOCATÁRIO:</strong> {selectedClient?.name.toUpperCase()},
                  portador do email {selectedClient?.email}...
                </p>
                <p className="mb-2">
                  <strong>OBJETO:</strong> O imóvel situado em {selectedProperty?.location},
                  denominado comercialmente "{selectedProperty?.title}"...
                </p>
                <p className="mb-2">
                  <strong>VALOR:</strong> R$ {selectedProperty?.price.toLocaleString('pt-BR')}, a
                  ser pago conforme cláusula 3ª...
                </p>
                <p>...</p>
                <p className="italic text-xs text-gray-400 mt-4">
                  [Este é um preview gerado automaticamente. O documento final conterá todas as
                  cláusulas jurídicas padrão.]
                </p>
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => setStep(1)}
                  className="text-gray-500 font-medium hover:text-foreground"
                >
                  Voltar e Editar
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-6 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 flex items-center gap-2 shadow-lg shadow-primary/20 transition-all"
                >
                  {isGenerating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <PenTool className="w-5 h-5" />
                  )}
                  {isGenerating ? 'Gerando PDF...' : 'Emitir Contrato'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS */}
          {step === 2 && generated && (
            <div className="absolute inset-0 bg-white z-10 flex flex-col items-center justify-center p-8 animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Contrato Gerado com Sucesso!
              </h2>
              <p className="text-muted-foreground text-center max-w-md mb-8">
                O documento foi salvo no cofre digital do cliente{' '}
                <strong>{selectedClient?.name}</strong> e está pronto para assinatura eletrônica.
              </p>

              <div className="flex gap-4">
                <button
                  onClick={() => addToast('info', 'Download simulado iniciado...')}
                  className="px-6 py-3 bg-background text-white rounded-xl font-bold hover:bg-accent flex items-center gap-2"
                >
                  <Download className="w-5 h-5" /> Baixar PDF
                </button>
                <button
                  onClick={reset}
                  className="px-6 py-3 bg-gray-100 text-slate-700 rounded-xl font-bold hover:bg-gray-200"
                >
                  Criar Novo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractGenerator;
