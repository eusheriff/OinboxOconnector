import React, { useState } from 'react';
import { Upload, DollarSign, MapPin, Home, FileText, Check, Sparkles } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { apiService } from '../../services/apiService';

export default function NewListing() {
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    location: '',
    type: 'sale',
    bedrooms: '',
    bathrooms: '',
    suites: '',
    garage: '',
    area: '',
    total_area: '',
    condo_value: '',
    iptu_value: '',
    description: '',
    publish_to_portals: false,
    features: [] as string[],
  });
  const { addToast } = useToast();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerateDescription = async () => {
    if (!formData.title || !formData.location) {
      addToast('warning', 'Preencha pelo menos o título e localização para gerar a descrição.');
      return;
    }
    setAiGenerating(true);
    try {
      // Mock AI generation
      setTimeout(() => {
        setFormData((prev) => ({
          ...prev,
          description: `Excelente oportunidade! ${formData.title} localizado em ${formData.location}. Este imóvel conta com ${formData.bedrooms} quartos e ${formData.bathrooms} banheiros, totalizando ${formData.area}m². Acabamento de alto padrão e localização privilegiada. Agende sua visita!`,
        }));
        setAiGenerating(false);
      }, 1500);
    } catch {
      addToast('error', 'Erro ao gerar descrição com IA.');
      setAiGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiService.createProperty({
        ...formData,
        price: Number(formData.price),
        features: formData.features,
      });
      addToast('success', 'Imóvel cadastrado com sucesso!');
      // Redirect would happen here
      setLoading(false);
    } catch (error) {
      console.error(error);
      addToast('error', 'Erro ao cadastrar imóvel');
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Novo Anúncio</h1>
        <p className="text-gray-600">Cadastre um novo imóvel para venda ou aluguel</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Home size={20} className="text-primary" />
            Informações Básicas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título do Anúncio
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                placeholder="Ex: Apartamento de Luxo no Centro"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="sale">Venda</option>
                <option value="rent">Aluguel</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  placeholder="0,00"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin size={20} className="text-primary" />
            Detalhes e Localização
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="col-span-4 md:col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endereço Completo
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                placeholder="Rua, Número, Bairro, Cidade"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quartos</label>
              <input
                type="number"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Suítes</label>
              <input
                type="number"
                name="suites"
                value={formData.suites}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Banheiros</label>
              <input
                type="number"
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vagas Garagem</label>
              <input
                type="number"
                name="garage"
                value={formData.garage}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Área Útil (m²)</label>
              <input
                type="number"
                name="area"
                value={formData.area}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condomínio (R$)
              </label>
              <input
                type="number"
                name="condo_value"
                value={formData.condo_value}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IPTU (R$)</label>
              <input
                type="number"
                name="iptu_value"
                value={formData.iptu_value}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>
        </div>

        {/* Portal Syndication */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles size={20} className="text-orange-500" />
            Publicação nos Portais
          </h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="publish_to_portals"
                checked={formData.publish_to_portals}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, publish_to_portals: e.target.checked }))
                }
                className="w-5 h-5 text-primary rounded focus:ring-primary"
              />
              <span className="text-gray-700 font-medium">
                Publicar automaticamente nos portais (Zap/VivaReal/OLX)
              </span>
            </label>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Ao marcar esta opção, este imóvel será incluído no seu Feed XML de integração.
          </p>
        </div>

        {/* Description & Media */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText size={20} className="text-primary" />
              Descrição e Mídia
            </h2>
            <button
              type="button"
              onClick={handleGenerateDescription}
              disabled={aiGenerating}
              className="text-sm flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
            >
              <Sparkles size={16} />
              {aiGenerating ? 'Gerando...' : 'Gerar com IA'}
            </button>
          </div>

          <div className="space-y-4">
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              placeholder="Descreva o imóvel..."
            />

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer">
              <Upload size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                Clique para fazer upload de fotos ou arraste aqui
              </p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG até 10MB</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center gap-2"
          >
            {loading ? (
              'Salvando...'
            ) : (
              <>
                <Check size={18} />
                <Check size={18} />
                Publicar Imóvel
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
