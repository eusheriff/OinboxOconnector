import React, { useState } from 'react';
import { Layout, Image as ImageIcon, Download, Share2 } from 'lucide-react';

export default function MarketingStudio() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const templates = [
    {
      id: '1',
      name: 'Story Moderno',
      type: 'Story',
      image: 'https://placehold.co/300x533/e2e8f0/94a3b8?text=Story+Template+1',
    },
    {
      id: '2',
      name: 'Post Feed Clean',
      type: 'Feed',
      image: 'https://placehold.co/400x400/e2e8f0/94a3b8?text=Feed+Template+1',
    },
    {
      id: '3',
      name: 'Destaque Venda',
      type: 'Story',
      image: 'https://placehold.co/300x533/e2e8f0/94a3b8?text=Story+Template+2',
    },
    {
      id: '4',
      name: 'Carrossel Info',
      type: 'Feed',
      image: 'https://placehold.co/400x400/e2e8f0/94a3b8?text=Feed+Template+2',
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Marketing Studio</h1>
        <p className="text-gray-600">Crie artes profissionais para suas redes sociais</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1">
        {/* Template Gallery */}
        <div className="lg:w-2/3">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Layout size={20} className="text-primary" />
            Modelos Disponíveis
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {templates.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTemplate(t.id)}
                className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                  selectedTemplate === t.id
                    ? 'border-blue-600 ring-2 ring-blue-100'
                    : 'border-transparent hover:border-gray-200'
                }`}
              >
                <img src={t.image} alt={t.name} className="w-full h-auto object-cover" />
                <div className="p-3 bg-white">
                  <p className="font-medium text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Editor / Preview Panel */}
        <div className="lg:w-1/3 bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Editor Rápido</h2>

          {selectedTemplate ? (
            <div className="space-y-6 flex-1">
              <div className="aspect-[9/16] bg-gray-100 rounded-lg flex items-center justify-center border border-dashed border-gray-300">
                <p className="text-gray-400 text-sm">Preview da Arte</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selecionar Imóvel
                  </label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none">
                    <option>Apartamento Centro</option>
                    <option>Casa Condomínio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço em Destaque
                  </label>
                  <input
                    type="text"
                    placeholder="R$ 500.000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button className="flex-1 bg-primary text-white py-2 rounded-lg hover:bg-primary/90 font-medium flex items-center justify-center gap-2">
                  <Download size={18} /> Baixar
                </button>
                <button className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 font-medium flex items-center justify-center gap-2">
                  <Share2 size={18} /> Postar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-center">
              <ImageIcon size={48} className="mb-2 opacity-50" />
              <p>Selecione um modelo ao lado para começar a editar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
