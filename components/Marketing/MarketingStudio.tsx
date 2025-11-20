
import React, { useState } from 'react';
import { MOCK_PROPERTIES } from '../../constants';
import { Property, MarketingTemplate } from '../../types';
import { Instagram, Download, Palette, Type, Sparkles, Image as ImageIcon, Layout } from 'lucide-react';

const TEMPLATES: MarketingTemplate[] = [
    { id: 't1', name: 'Stories - Vendido', format: 'story', label: 'VENDIDO', color: 'bg-red-600' },
    { id: 't2', name: 'Stories - Oportunidade', format: 'story', label: 'OPORTUNIDADE', color: 'bg-blue-600' },
    { id: 't3', name: 'Post - Novo', format: 'post', label: 'NOVIDADE', color: 'bg-green-600' },
    { id: 't4', name: 'Post - Luxo', format: 'post', label: 'ALTO PADRÃO', color: 'bg-slate-900' },
];

const MarketingStudio: React.FC = () => {
  const [selectedProperty, setSelectedProperty] = useState<Property>(MOCK_PROPERTIES[0]);
  const [selectedTemplate, setSelectedTemplate] = useState<MarketingTemplate>(TEMPLATES[1]);
  const [customText, setCustomText] = useState('');

  return (
    <div className="flex-1 bg-gray-50 p-4 md:p-8 overflow-y-auto h-full">
        <div className="max-w-6xl mx-auto h-full flex flex-col">
            
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Instagram className="w-8 h-8 text-pink-600" /> Marketing Studio
                </h1>
                <p className="text-slate-500">Crie posts profissionais para redes sociais instantaneamente usando os dados dos seus imóveis.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
                
                {/* Controls */}
                <div className="lg:col-span-4 space-y-6">
                    
                    {/* Property Selector */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" /> Selecione o Imóvel
                        </label>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                            {MOCK_PROPERTIES.map(prop => (
                                <div 
                                    key={prop.id}
                                    onClick={() => setSelectedProperty(prop)}
                                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors border ${selectedProperty.id === prop.id ? 'bg-blue-50 border-blue-500' : 'border-transparent hover:bg-gray-50'}`}
                                >
                                    <img src={prop.image} className="w-10 h-10 rounded object-cover" alt="" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate">{prop.title}</p>
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
                            {TEMPLATES.map(temp => (
                                <div 
                                    key={temp.id}
                                    onClick={() => setSelectedTemplate(temp)}
                                    className={`p-3 rounded-lg border cursor-pointer text-center transition-all ${selectedTemplate.id === temp.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <div className={`w-full h-12 rounded mb-2 ${temp.color} opacity-20 mx-auto`}></div>
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
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ex: Agende sua visita hoje!"
                            value={customText}
                            onChange={e => setCustomText(e.target.value)}
                        />
                        <div className="mt-4 flex gap-2">
                             <button className="flex-1 py-2 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg hover:bg-purple-100 flex items-center justify-center gap-1">
                                 <Sparkles className="w-3 h-3" /> Sugerir Legenda
                             </button>
                             <button className="flex-1 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 flex items-center justify-center gap-1">
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
                        className={`relative bg-white shadow-2xl overflow-hidden transition-all duration-500 group cursor-default ${
                            selectedTemplate.format === 'story' 
                                ? 'w-[360px] h-[640px] rounded-2xl' 
                                : 'w-[500px] h-[500px] rounded-none'
                        }`}
                    >
                        {/* Background Image */}
                        <img src={selectedProperty.image} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[2s]" alt="" />
                        
                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30"></div>

                        {/* Top Badge */}
                        <div className="absolute top-8 left-1/2 -translate-x-1/2">
                             <span className={`px-6 py-2 ${selectedTemplate.color} text-white font-black tracking-[0.2em] text-lg uppercase shadow-lg`}>
                                 {selectedTemplate.label}
                             </span>
                        </div>

                        {/* Bottom Info */}
                        <div className="absolute bottom-0 left-0 right-0 p-8 text-center text-white">
                            <h2 className="text-2xl font-bold mb-1 leading-tight drop-shadow-md">{selectedProperty.title}</h2>
                            <p className="text-gray-200 text-sm mb-4 flex items-center justify-center gap-1">
                                {selectedProperty.location}
                            </p>
                            
                            <div className="inline-block border-2 border-white px-6 py-2 text-xl font-bold mb-4">
                                R$ {selectedProperty.price.toLocaleString('pt-BR')}
                            </div>
                            
                            {customText && (
                                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg text-sm font-medium">
                                    {customText}
                                </div>
                            )}
                        </div>
                        
                        {/* Watermark */}
                        <div className="absolute bottom-2 right-2 opacity-50 text-[8px] text-white font-mono">
                            OConnector
                        </div>
                    </div>

                </div>

            </div>
        </div>
    </div>
  );
};

export default MarketingStudio;
