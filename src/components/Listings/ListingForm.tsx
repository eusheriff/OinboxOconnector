import React, { useState, useEffect } from 'react';
import { Platform } from '@shared/types';
import {
  Upload,
  Sparkles,
  Check,
  X,
  Loader2,
  Facebook,
  Instagram,
  Eye,
  Image as ImageIcon,
  CloudLightning,
  Save,
  MapPin,
  Home,
  DollarSign,
  PenTool,
  Plus,
  Trash2,
  TrendingUp,
  Key,
  Globe,
} from 'lucide-react';
import { analyzePropertyImage } from '@/services/aiService';
import { apiService } from '@/services/apiService';
import { uploadImageToCloudflare } from '@/services/integrationService';
import { useToast } from '@/contexts/ToastContext';
import PortalSelector from '@/components/Portals/PortalSelector';
import PublicationStatusDisplay from '@/components/Portals/PublicationStatus';
import { PortalConfig, PropertyPublication } from '@/types';

const ListingForm: React.FC = () => {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    listingType: 'sale' as 'sale' | 'rent', // Novo campo
    type: 'Apartamento',
    location: '',
    features: '',
    price: '',
    description: '',
    images: [] as string[],
  });

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pendingAnalysisFile, setPendingAnalysisFile] = useState<File | null>(null);

  // Novos estados para publicação em lote
  const [portalConfigs, setPortalConfigs] = useState<PortalConfig[]>([]);
  const [publications, setPublications] = useState<PropertyPublication[]>([]);
  const [showPublicationStatus, setShowPublicationStatus] = useState(false);
  const [publishedPropertyId, setPublishedPropertyId] = useState<string | null>(null);

  // Carregar configurações de portais ao montar o componente
  useEffect(() => {
    loadPortalConfigs();
  }, []);

  const loadPortalConfigs = async () => {
    try {
      const response: any = await apiService.getPortalConfigs();
      if (response.success) {
        setPortalConfigs(response.configs || []);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de portais:', error);
    }
  };

  const platforms = [
    {
      id: Platform.INSTAGRAM,
      label: 'Instagram',
      icon: Instagram,
      color: 'bg-pink-50 text-pink-600 border-pink-200',
    },
    {
      id: Platform.FACEBOOK,
      label: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-50 text-primary border-blue-200',
    },
    {
      id: Platform.ZAP,
      label: 'Zap Imóveis',
      icon: Check,
      color: 'bg-orange-50 text-orange-600 border-orange-200',
    },
    {
      id: Platform.OLX,
      label: 'OLX',
      icon: Check,
      color: 'bg-purple-50 text-purple-600 border-purple-200',
    },
    {
      id: Platform.PORTAL_IMOVEL,
      label: 'Portal Imóvel',
      icon: Check,
      color: 'bg-green-50 text-green-600 border-green-200',
    },
  ];

  const handleGenerateDescription = async () => {
    if (!formData.features && !formData.location) {
      addToast('warning', 'Preencha ao menos a localização ou características.');
      return;
    }
    setIsGenerating(true);
    try {
      const result = await apiService.generateDescription({
        type: formData.type,
        location: formData.location,
        features: formData.features,
      });
      setFormData((prev) => ({ ...prev, description: result.description }));
      setFormData((prev) => ({ ...prev, description: result.description }));
    } catch (e) {
      addToast('error', 'Erro ao gerar descrição.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 1. Upload para Cloudflare
      setIsUploading(true);
      try {
        const cloudflareUrl = await uploadImageToCloudflare(file);

        // Adiciona imagem à visualização usando a URL retornada (simulada ou real)
        setFormData((prev) => ({ ...prev, images: [...prev.images, cloudflareUrl] }));

        // 2. Análise de IA (Gemini)
        if (formData.features.length < 5) {
          // Trigger modal instead of window.confirm
          setPendingAnalysisFile(file);
        }
      } catch {
        addToast('error', 'Erro ao processar imagens');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const confirmAnalysis = async () => {
    if (!pendingAnalysisFile) return;
    setPendingAnalysisFile(null);
    setIsAnalyzingImage(true);
    try {
      const result = await analyzePropertyImage(pendingAnalysisFile);
      setFormData((prev) => ({
        ...prev,
        features: prev.features ? `${prev.features}, ${result.features}` : result.features,
        description: result.description || prev.description,
      }));
      addToast('success', 'Características extraídas pela IA!');
    } catch (e) {
      addToast('error', 'Falha na análise de imagem.');
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  // PortalSelector já tem "Selecionar Todos" embutido — este handler é redundante

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedPlatforms.length === 0) {
      addToast('warning', 'Selecione ao menos um portal para publicação');
      return;
    }

    setIsPosting(true);

    try {
      // 1. Salvar o imóvel no banco de dados
      const propertyData = {
        title: formData.title,
        listing_type: formData.listingType,
        type: formData.type,
        location: formData.location,
        features: formData.features.split(',').map((f) => f.trim()).filter(Boolean),
        price: parseFloat(formData.price.replace(/[^0-9.-]+/g, '') || '0'),
        description: formData.description,
        image_url: formData.images[0] || null,
        publish_to_portals: true,
      };

      const response: any = await apiService.createProperty(propertyData);

      if (!response.success) {
        throw new Error(response.error || 'Falha ao criar imóvel');
      }

      const propertyId = response.id;
      setPublishedPropertyId(propertyId);

      // 2. Publicar em lote nos portais selecionados
      const publishResult: any = await apiService.bulkPublishProperty(propertyId, selectedPlatforms);

      if (publishResult.success) {
        addToast(
          'success',
          `Imóvel publicado com sucesso em ${publishResult.successful} de ${publishResult.total} portais!`,
        );

        // 3. Carregar status de publicações
        const publicationsResponse: any = await apiService.getPropertyPublications(propertyId);
        if (publicationsResponse.success) {
          setPublications(publicationsResponse.publications || []);
          setShowPublicationStatus(true);
        }

        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      } else {
        addToast(
          'warning',
          `Imóvel criado, mas houve erros na publicação: ${publishResult.failed} falha(s)`,
        );
      }
    } catch (error) {
      addToast('error', `Erro ao publicar imóvel: ${(error as Error).message}`);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="flex-1 bg-gray-50 p-4 md:p-8 overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ImageIcon className="text-primary" /> Novo Anúncio
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
                {isUploading && (
                  <span className="text-xs text-orange-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Enviando para Cloudflare...
                  </span>
                )}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {formData.images.map((img, idx) => (
                  <div
                    key={idx}
                    className="aspect-square rounded-lg overflow-hidden relative group border border-gray-200 shadow-sm"
                  >
                    <img src={img} alt="preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div
                      className="absolute bottom-1 right-1 bg-orange-500/80 p-0.5 rounded text-white"
                      title="Hospedado na Cloudflare"
                    >
                      <CloudLightning className="w-3 h-3" />
                    </div>
                  </div>
                ))}
                <label
                  className={`aspect-square rounded-lg border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer group ${isAnalyzingImage || isUploading ? 'border-purple-400 bg-purple-50' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'}`}
                >
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
                      <span className="text-xs font-medium text-gray-500 group-hover:text-blue-500">
                        Adicionar Foto
                      </span>
                      <span className="text-[9px] text-gray-400 mt-1 text-center">
                        + Cloudflare CDN
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isAnalyzingImage || isUploading}
                  />
                </label>
              </div>
            </div>

            {/* Platform Selection - Usando novo componente */}
            <PortalSelector
              selectedPortals={selectedPlatforms}
              onTogglePortal={(portalId) =>
                setSelectedPlatforms((prev) =>
                  prev.includes(portalId)
                    ? prev.filter((p) => p !== portalId)
                    : [...prev, portalId],
                )
              }
              onSelectAll={() => {
                // Lógica handled in PortalSelector
              }}
              portalConfigs={portalConfigs}
            />
          </div>

          {/* Right Column - Data (8 cols) */}
          <div className="lg:col-span-7 space-y-6 order-1 lg:order-2">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3 items-start">
              <Eye className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-blue-800">Dica de Produtividade</h4>
                <p className="text-xs text-blue-700 mt-1">
                  Carregue uma foto primeiro! Nossa IA identificará pisos, acabamentos e detalhes
                  para preencher o formulário por você.
                </p>
              </div>
            </div>

            {/* Finalidade Toggle */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Finalidade do Anúncio
              </label>
              <div className="flex gap-4">
                <label
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${formData.listingType === 'sale' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-gray-200 text-muted-foreground hover:border-blue-300'}`}
                >
                  <input
                    type="radio"
                    name="listingType"
                    className="hidden"
                    checked={formData.listingType === 'sale'}
                    onChange={() => setFormData({ ...formData, listingType: 'sale' })}
                  />
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-bold">Venda</span>
                </label>
                <label
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${formData.listingType === 'rent' ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm' : 'bg-white border-gray-200 text-muted-foreground hover:border-purple-300'}`}
                >
                  <input
                    type="radio"
                    name="listingType"
                    className="hidden"
                    checked={formData.listingType === 'rent'}
                    onChange={() => setFormData({ ...formData, listingType: 'rent' })}
                  />
                  <Key className="w-4 h-4" />
                  <span className="font-bold">Locação / Aluguel</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Título do Anúncio
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-medium text-lg"
                placeholder={
                  formData.listingType === 'sale'
                    ? 'Ex: Espetacular Cobertura no Jardins'
                    : 'Ex: Apartamento para Alugar no Centro'
                }
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tipo do Imóvel
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none bg-white"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option>Apartamento</option>
                  <option>Casa</option>
                  <option>Terreno</option>
                  <option>Comercial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {formData.listingType === 'sale' ? 'Valor de Venda' : 'Valor do Aluguel (Mensal)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-primary outline-none"
                    placeholder="0,00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Localização</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none"
                placeholder="Bairro, Cidade ou Condomínio"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Características & Diferenciais
                </label>
                {isAnalyzingImage && (
                  <span className="text-xs text-purple-600 font-bold animate-pulse">
                    IA preenchendo...
                  </span>
                )}
              </div>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary outline-none min-h-[100px] text-sm"
                placeholder="Porcelanato, Varanda Gourmet, Vista Livre..."
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              ></textarea>
            </div>

            <div className="relative">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Descrição (Marketing)
                </label>
                <button
                  type="button"
                  onClick={handleGenerateDescription}
                  disabled={isGenerating || (!formData.features && !formData.location)}
                  className="text-xs flex items-center gap-1 bg-purple-50 text-purple-700 px-3 py-1 rounded-full font-semibold hover:bg-purple-100 disabled:opacity-50 transition-all"
                >
                  {isGenerating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  Gerar Texto Vendedor
                </button>
              </div>
              <textarea
                className="w-full border border-purple-100 bg-purple-50/10 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none min-h-[180px] text-sm leading-relaxed"
                placeholder="Use a IA para transformar características em um texto envolvente..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              ></textarea>
            </div>

            <hr className="border-gray-100" />

            <div className="flex gap-4">
              <button
                type="button"
                className="flex-1 py-3 border border-gray-300 rounded-lg text-muted-foreground font-medium hover:bg-gray-50 transition-colors"
              >
                Salvar Rascunho
              </button>
              <button
                type="submit"
                disabled={isPosting || selectedPlatforms.length === 0}
                className="flex-[2] py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {isPosting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Publicando em{' '}
                    {selectedPlatforms.length} canais...
                  </>
                ) : (
                  <span>Publicar Imóvel</span>
                )}
              </button>
            </div>

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg flex items-start gap-3 animate-fade-in">
                <div className="bg-green-100 p-1 rounded-full">
                  <Check className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="font-bold">Imóvel Publicado!</p>
                  <p className="text-sm">
                    Seu imóvel foi enviado para publicação nos portais selecionados.
                  </p>

                  {/* Status de Publicações */}
                  {showPublicationStatus && publications.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-bold mb-2 text-green-900">
                        Status de Publicação:
                      </h4>
                      <PublicationStatusDisplay publications={publications} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Analysis Confirmation Modal */}
      {pendingAnalysisFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full animate-in zoom-in duration-200">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" /> Analisar Imagem?
            </h3>
            <p className="text-gray-600 mb-6">
              Gostaria que nossa IA identificasse automaticamente as características do imóvel
              (piso, iluminação, etc) a partir desta foto?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPendingAnalysisFile(null)}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-medium"
              >
                Não, obrigado
              </button>
              <button
                onClick={confirmAnalysis}
                className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg font-bold shadow-lg shadow-purple-200"
              >
                Sim, analisar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingForm;
