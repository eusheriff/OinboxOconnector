import React, { useState, useEffect, useRef } from 'react';
import { Property, MarketingTemplate } from '@shared/types';
import {
  Instagram,
  Download,
  Type,
  Sparkles,
  Image as ImageIcon,
  Layout,
  Loader2,
} from 'lucide-react';
import { apiService } from '@/services/apiService';
import { generateMarketingCaption } from '@/services/aiService';
import html2canvas from 'html2canvas';
import { useToast } from '@/contexts/ToastContext';

const TEMPLATES: MarketingTemplate[] = [
  { id: 't1', name: 'Stories - Vendido', format: 'story', label: 'VENDIDO', color: 'bg-red-600' },
  {
    id: 't2',
    name: 'Stories - Oportunidade',
    format: 'story',
    label: 'OPORTUNIDADE',
    color: 'bg-primary',
  },
  { id: 't3', name: 'Post - Novo', format: 'post', label: 'NOVIDADE', color: 'bg-green-600' },
  { id: 't4', name: 'Post - Luxo', format: 'post', label: 'ALTO PADR肙', color: 'bg-background' },
];

const MarketingStudio: React.FC = () => {
  const { addToast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MarketingTemplate>(TEMPLATES[1]);
  const [customText, setCustomText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingProps, setIsLoadingProps] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        const data = await apiService.getProperties();
        setProperties(data);
        if (data.length > 0) setSelectedProperty(data[0]);
      } catch (e) {
        addToast('error', 'Falha ao carregar im贸veis');
      } finally {
        setIsLoadingProps(false);
      }
    };
    loadProperties();
  }, []);

  const handleGenerateCaption = async () => {
    if (!selectedProperty) return;
    setIsGenerating(true);
    try {
      const caption = await generateMarketingCaption(
        selectedProperty.title,
        selectedProperty.location,
        selectedProperty.price.toString(),
        selectedTemplate.label,
      );
      setCustomText(caption.replace(/"/g, ''));
    } catch (e) {
      addToast('error', 'Erro ao gerar legenda.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!canvasRef.current) return;
    try {
      const canvas = await html2canvas(canvasRef.current, { useCORS: true, scale: 2 });
      const link = document.createElement('a');
      link.download = `oconnector-post-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      addToast(
        'error',
        'Erro ao gerar imagem. Verifique se a imagem do im贸vel permite CORS (Cloudflare R2 configurado).',
      );
    }
  };

  if (isLoadingProps) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!selectedProperty) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
        <p>Nenhum im贸vel encontrado. Cadastre um im贸vel primeiro.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 p-4 md:p-8 overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto h-full flex flex-col">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Instagram className="w-8 h-8 text-pink-600" /> Marketing Studio
          </h1>
          <p className="text-muted-foreground">
            Crie posts profissionais para redes sociais instantaneamente usando os dados dos seus
            im贸veis.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
          {/* Controls */}
          <div className="lg:col-span-4 space-y-6">
            {/* Property Selector */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Selecione o Im贸vel
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {properties.map((prop) => (
                  <div
                    key={prop.id}
                    onClick={() => setSelectedProperty(prop)}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors border ${selectedProperty?.id === prop.id ? 'bg-blue-50 border-blue-500' : 'border-transparent hover:bg-gray-50'}`}
                  >
                    <img
                      src={prop.image || 'https://placehold.co/150'}
                      className="w-10 h-10 rounded object-cover"
                      alt=""
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{prop.title}</p>
                      <p className="text-xs text-gray-500 truncate">{prop.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Template Selector */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                <Layout className="w-4 h-4" /> Escolha o Layout
              </label>
              <div className="grid grid-cols-2 gap-3">
                {TEMPLATES.map((temp) => (
                  <div
                    key={temp.id}
                    onClick={() => setSelectedTemplate(temp)}
                    className={`p-3 rounded-lg border cursor-pointer text-center transition-all ${selectedTemplate.id === temp.id ? 'border-blue-500 bg-blue-50 ring-1 ring-primary' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <div
                      className={`w-full h-12 rounded mb-2 ${temp.color} opacity-20 mx-auto`}
                    ></div>
                    <p className="text-xs font-bold text-slate-700">{temp.name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Customization */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                <Type className="w-4 h-4" /> Texto Personalizado
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none min-h-[80px]"
                placeholder="Ex: Agende sua visita hoje!"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
              />
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleGenerateCaption}
                  disabled={isGenerating}
                  className="flex-1 py-2 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg hover:bg-purple-100 flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  Sugerir Legenda
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 py-2 bg-background text-white text-xs font-bold rounded-lg hover:bg-accent flex items-center justify-center gap-1"
                >
                  <Download className="w-3 h-3" /> Baixar PNG
                </button>
              </div>
            </div>
          </div>

          {/* Canvas Preview */}
          <div className="lg:col-span-8 bg-gray-200 rounded-2xl flex items-center justify-center p-8 relative overflow-hidden border border-gray-300">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>

            {/* THE ARTWORK */}
            <div
              ref={canvasRef}
              className={`relative bg-white shadow-2xl overflow-hidden transition-all duration-500 group cursor-default ${selectedTemplate.format === 'story'
                  ? 'w-[360px] h-[640px] rounded-2xl'
                  : 'w-[500px] h-[500px] rounded-none'
                }`}
            >
              {/* Background Image */}
              <img
                src={selectedProperty.image || 'https://placehold.co/500'}
                crossOrigin="anonymous"
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[2s]"
                alt=""
              />

              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30"></div>

              {/* Top Badge */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2">
                <span
                  className={`px-6 py-2 ${selectedTemplate.color} text-white font-black tracking-[0.2em] text-lg uppercase shadow-lg`}
                >
                  {selectedTemplate.label}
                </span>
              </div>

              {/* Bottom Info */}
              <div className="absolute bottom-0 left-0 right-0 p-8 text-center text-white">
                <h2 className="text-2xl font-bold mb-1 leading-tight drop-shadow-md">
                  {selectedProperty.title}
                </h2>
                <p className="text-gray-200 text-sm mb-4 flex items-center justify-center gap-1">
                  {selectedProperty.location}
                </p>

                <div className="inline-block border-2 border-white px-6 py-2 text-xl font-bold mb-4">
                  R$ {Number(selectedProperty.price).toLocaleString('pt-BR')}
                </div>

                {customText && (
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg text-sm font-medium whitespace-pre-wrap">
                    {customText}
                  </div>
                )}
              </div>

              {/* Watermark */}
              <div className="absolute bottom-2 right-2 opacity-50 text-[8px] text-white font-mono">
                Euimob
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingStudio;
