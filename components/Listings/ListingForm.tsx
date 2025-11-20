
import React, { useState } from 'react';
import { Platform } from '../../types';
import { Upload, Sparkles, Check, AlertCircle, X, Loader2, Facebook, Instagram, Eye, Image as ImageIcon, CloudLightning } from 'lucide-react';
import { generatePropertyDescription, analyzePropertyImage } from '../../services/geminiService';
import { uploadImageToCloudflare } from '../../services/integrationService';

const ListingForm: React.FC = () => {
  const [formData, setFormData] = useState({
    title: '',
    type: 'Apartamento',
    location: '',
    features: '',
    price: '',
    description: '',
    images: [] as string[]
  });
  
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [success, setSuccess] = useState(false);

  const platforms = [
    { id: Platform.INSTAGRAM, label: 'Instagram', icon: Instagram, color: 'bg-pink-50 text-pink-600 border-pink-200' },
    { id: Platform.FACEBOOK, label: 'Facebook', icon: Facebook, color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { id: Platform.ZAP, label: 'Zap Imóveis', icon: Check, color: 'bg-orange-50 text-orange-600 border-orange-200' },
    { id: Platform.OLX, label: 'OLX', icon: Check, color: 'bg-purple-50 text-purple-600 border-purple-200' },
    { id: Platform.PORTAL_IMOVEL, label: 'Portal Imóvel', icon: Check, color: 'bg-green-50 text-green-600 border-green-200' },
  ];

  const handleGenerateDescription = async () => {
    if (!formData.features && !formData.location) {
      alert("Preencha ao menos a localização ou características.");
      return;
    }
    setIsGenerating(true);
    const desc = await generatePropertyDescription(formData.features, formData.type, formData.location);
    setFormData(prev => ({ ...prev, description: desc }));
    setIsGenerating(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // 1. Upload para Cloudflare
      setIsUploading(true);
      try {
        const cloudflareUrl = await uploadImageToCloudflare(file);
        
        // Adiciona imagem à visualização usando a URL retornada (simulada ou real)
        setFormData(prev => ({ ...prev, images: [...prev.images, cloudflareUrl] }));

        // 2. Análise de IA (Gemini)
        if (formData.features.length < 5) {
            const confirmAnalyze = window.confirm("Imagem enviada para Cloudflare! Gostaria que a IA analisasse essa foto para preencher as características automaticamente?");
            if (confirmAnalyze) {
                setIsAnalyzingImage(true);
                const result = await analyzePropertyImage(file);
                
                setFormData(prev => ({
                    ...prev,
                    features: prev.features ? `${prev.features}, ${result.features}` : result.features,
                    description: result.description || prev.description
                }));
                setIsAnalyzingImage(false);
            }
        }
      } catch (error) {
        alert("Erro ao fazer upload da imagem.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSelectAllPlatforms = () => {
      if (selectedPlatforms.length === platforms.length) {
          setSelectedPlatforms([]);
      } else {
          setSelectedPlatforms(platforms.map(p => p.id));
      }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPosting(true);
    // Simula delay de API e POST para múltiplos endpoints
    setTimeout(() => {
      setIsPosting(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    }, 2500);
  };

  return (
    <div className="flex-1 bg-gray-50 p-4 md:p-8 overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        
        <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <ImageIcon className="text-blue-600" /> Novo Anúncio
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Publique em +50 portais simultaneamente.</p>
          </div>
          <div className="flex gap-2">
             <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> IA Ativada
             </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column - Visuals & Platforms (4 cols) */}
          <div className="lg:col-span-5 space-y-6 order-2 lg:order-1">
             
             {/* Upload Section */}
             <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700 flex justify-between">
                    Galeria de Fotos
                    {isUploading && <span className="text-xs text-orange-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Enviando para Cloudflare...</span>}
                </label>
                <div className="grid grid-cols-3 gap-3">
                    {formData.images.map((img, idx) => (
                    <div key={idx} className="aspect-square rounded-lg overflow-hidden relative group border border-gray-200 shadow-sm">
                        <img src={img} alt="preview" className="w-full h-full object-cover" />
                        <button type="button" className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                        <X className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-1 right-1 bg-orange-500/80 p-0.5 rounded text-white" title="Hospedado na Cloudflare">
                            <CloudLightning className="w-3 h-3" />
                        </div>
                    </div>
                    ))}
                    <label className={`aspect-square rounded-lg border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer group ${isAnalyzingImage || isUploading ? 'border-purple-400 bg-purple-50' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'}`}>
                        {isAnalyzingImage || isUploading ? (
                            <>
                                <Loader2 className="w-6 h-6 mb-2 text-purple-600 animate-spin" />
                                <span className="text-[10px] font-bold text-purple-600 text-center px-2">
                                    {isUploading ? 'Enviando...' : 'Analisando...'}
                                </span>
                            </>
                        ) : (
                            <>
                                <Upload className="w-6 h-6 mb-2 text-gray-400 group-hover:text-blue-500" />
                                <span className="text-xs font-medium text-gray-500 group-hover:text-blue-500">Adicionar Foto</span>
                                <span className="text-[9px] text-gray-400 mt-1 text-center">+ Cloudflare CDN</span>
                            </>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isAnalyzingImage || isUploading} />
                    </label>
                </div>
             </div>

             {/* Platform Selection */}
             <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Canais de Destino</h3>
                    <button type="button" onClick={handleSelectAllPlatforms} className="text-xs text-blue-600 font-medium hover:underline">
                        {selectedPlatforms.length === platforms.length ? 'Desmarcar' : 'Selecionar Todos'}
                    </button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {platforms.map((p) => (
                    <label key={p.id} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${selectedPlatforms.includes(p.id) ? 'bg-white border-blue-500 shadow-sm ring-1 ring-blue-500' : 'bg-white border-gray-200 hover:border-blue-300'}`}>
                        <input 
                        type="checkbox" 
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mr-3"
                        checked={selectedPlatforms.includes(p.id)}
                        onChange={() => togglePlatform(p.id)}
                        />
                        <div className={`p-1.5 rounded-md mr-3 ${p.color}`}>
                            <p.icon className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-slate-700 text-sm">{p.label}</span>
                    </label>
                    ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-center text-gray-400">
                    Total de canais selecionados: {selectedPlatforms.length}
                </div>
            </div>
          </div>

          {/* Right Column - Data (8 cols) */}
          <div className="lg:col-span-7 space-y-6 order-1 lg:order-2">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3 items-start">
                <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                    <h4 className="text-sm font-bold text-blue-800">Dica de Produtividade</h4>
                    <p className="text-xs text-blue-700 mt-1">Carregue uma foto primeiro! Nossa IA identificará pisos, acabamentos e detalhes para preencher o formulário por você.</p>
                </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Título do Anúncio</label>
              <input 
                type="text" 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-lg"
                placeholder="Ex: Espetacular Cobertura no Jardins"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                >
                  <option>Apartamento</option>
                  <option>Casa</option>
                  <option>Terreno</option>
                  <option>Comercial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Valor de Venda</label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                    <input 
                    type="number" 
                    className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0,00"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                    />
                </div>
              </div>
            </div>

            <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">Localização</label>
               <input 
                 type="text" 
                 className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                 placeholder="Bairro, Cidade ou Condomínio"
                 value={formData.location}
                 onChange={e => setFormData({...formData, location: e.target.value})}
               />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                 <label className="block text-sm font-medium text-slate-700">Características & Diferenciais</label>
                 {isAnalyzingImage && <span className="text-xs text-purple-600 font-bold animate-pulse">IA preenchendo...</span>}
              </div>
              <textarea 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px] text-sm"
                placeholder="Porcelanato, Varanda Gourmet, Vista Livre..."
                value={formData.features}
                onChange={e => setFormData({...formData, features: e.target.value})}
              ></textarea>
            </div>

            <div className="relative">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">Descrição (Marketing)</label>
                <button 
                  type="button" 
                  onClick={handleGenerateDescription}
                  disabled={isGenerating || (!formData.features && !formData.location)}
                  className="text-xs flex items-center gap-1 bg-purple-50 text-purple-700 px-3 py-1 rounded-full font-semibold hover:bg-purple-100 disabled:opacity-50 transition-all"
                >
                  {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Gerar Texto Vendedor
                </button>
              </div>
              <textarea 
                className="w-full border border-purple-100 bg-purple-50/10 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none min-h-[180px] text-sm leading-relaxed"
                placeholder="Use a IA para transformar características em um texto envolvente..."
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              ></textarea>
            </div>

            <hr className="border-gray-100" />

            <div className="flex gap-4">
                <button type="button" className="flex-1 py-3 border border-gray-300 rounded-lg text-slate-600 font-medium hover:bg-gray-50 transition-colors">
                    Salvar Rascunho
                </button>
                <button 
                    type="submit" 
                    disabled={isPosting || selectedPlatforms.length === 0}
                    className="flex-[2] py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                    {isPosting ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Publicando em {selectedPlatforms.length} canais...
                    </>
                    ) : (
                    <>Publicar Imóvel</>
                    )}
                </button>
            </div>
            
            {success && (
              <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg flex items-start gap-3 animate-fade-in">
                <div className="bg-green-100 p-1 rounded-full"><Check className="w-4 h-4" /></div>
                <div>
                    <p className="font-bold">Sucesso!</p>
                    <p className="text-sm">Seu imóvel está sendo processado e aparecerá em breve no Instagram, Facebook e Portais selecionados.</p>
                </div>
              </div>
            )}

          </div>
        </form>
      </div>
    </div>
  );
};

export default ListingForm;
