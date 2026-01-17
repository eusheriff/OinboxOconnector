import React, { useState } from 'react';
import { MOCK_PROPERTIES } from '../../constants';
import { Property } from '../../types';
import { MapPin, Navigation, X, Loader2, Sparkles, ExternalLink, Building2 } from 'lucide-react';
import { askLocationAssistant, GroundingSource } from '../../services/geminiService';

const PropertyMap: React.FC = () => {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [locationInfo, setLocationInfo] = useState<{
    text: string;
    sources: GroundingSource[];
  } | null>(null);

  const handlePinClick = (property: Property) => {
    setSelectedProperty(property);
    setLocationInfo(null); // Reset previous analysis
  };

  const handleExploreNeighborhood = async () => {
    if (!selectedProperty) return;

    setIsAnalyzing(true);
    // Uses Gemini + Google Maps Tool
    const result = await askLocationAssistant(
      selectedProperty.location,
      'Escolas, Restaurantes e Segurança',
    );
    setLocationInfo(result);
    setIsAnalyzing(false);
  };

  return (
    <div className="flex-1 relative h-full bg-slate-100 overflow-hidden">
      {/* Header overlay */}
      <div className="absolute top-6 left-6 z-10 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-white/50">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Navigation className="w-5 h-5 text-primary" /> Mapa de Oportunidades
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Visualize seus {MOCK_PROPERTIES.length} imóveis ativos.
        </p>
      </div>

      {/* Map Container (Simulated) */}
      <div className="w-full h-full relative bg-[#e5e7eb] group cursor-grab active:cursor-grabbing">
        {/* Mock Map Background using a subtle pattern or image */}
        <div
          className="absolute inset-0 opacity-60 bg-cover bg-center grayscale-[30%]"
          style={{
            backgroundImage:
              'url("https://img.freepik.com/free-vector/city-map-abstract-background_23-2148303626.jpg?w=2000")',
            backgroundSize: 'cover',
          }}
        />

        {/* Pins */}
        {MOCK_PROPERTIES.map((property) => (
          <button
            key={property.id}
            onClick={() => handlePinClick(property)}
            className="absolute transform -translate-x-1/2 -translate-y-full transition-all duration-300 hover:scale-110 hover:z-20 group/pin"
            style={{
              left: `${property.coordinates?.x || 50}%`,
              top: `${property.coordinates?.y || 50}%`,
            }}
          >
            <div
              className={`relative flex flex-col items-center ${selectedProperty?.id === property.id ? 'scale-110' : ''}`}
            >
              <div
                className={`p-2 rounded-full shadow-lg border-2 border-white ${selectedProperty?.id === property.id ? 'bg-primary' : 'bg-red-500'}`}
              >
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="w-0.5 h-3 bg-gray-800/30"></div>
              <div className="w-8 h-1.5 bg-black/20 rounded-full blur-[2px]"></div>

              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-2 opacity-0 group-hover/pin:opacity-100 transition-opacity bg-background text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                R$ {property.price.toLocaleString('pt-BR')}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Property Details Sidebar (Slide-over) */}
      {selectedProperty && (
        <div className="absolute top-4 right-4 bottom-4 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-slide-in-right z-30">
          <div className="relative h-48 bg-gray-200 flex-shrink-0">
            <img
              src={selectedProperty.image}
              alt={selectedProperty.title}
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => setSelectedProperty(null)}
              className="absolute top-3 right-3 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold text-foreground">
              {selectedProperty.location}
            </div>
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            <h2 className="text-xl font-bold text-foreground mb-1">{selectedProperty.title}</h2>
            <p className="text-primary font-bold text-lg mb-4">
              R$ {selectedProperty.price.toLocaleString('pt-BR')}
            </p>

            <div className="flex flex-wrap gap-2 mb-6">
              {selectedProperty.features.map((feat) => (
                <span key={feat} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                  {feat}
                </span>
              ))}
            </div>

            {/* AI Map Grounding Section */}
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-indigo-900 text-sm">
                  Raio-X da Região (Google Maps)
                </h3>
              </div>

              {!locationInfo ? (
                <div className="text-center py-2">
                  <p className="text-xs text-indigo-700 mb-3">
                    Descubra o que há de bom ao redor deste imóvel usando dados reais do Google
                    Maps.
                  </p>
                  <button
                    onClick={handleExploreNeighborhood}
                    disabled={isAnalyzing}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {isAnalyzing ? 'Consultando Mapa...' : 'Analisar Vizinhança'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 animate-fade-in">
                  <p className="text-xs text-slate-700 leading-relaxed italic bg-white p-2 rounded border border-indigo-100">
                    "{locationInfo.text}"
                  </p>

                  {locationInfo.sources.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">
                        Locais Encontrados:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {locationInfo.sources.map((source, idx) => (
                          <a
                            key={idx}
                            href={source.uri}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 px-2 py-1 bg-white border border-indigo-200 rounded text-[10px] text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 truncate max-w-full transition-colors"
                          >
                            {source.title} <ExternalLink className="w-2 h-2 flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleExploreNeighborhood}
                    className="text-xs text-indigo-500 underline hover:text-indigo-700 w-full text-center mt-2"
                  >
                    Atualizar Análise
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <button className="w-full py-3 bg-background text-white rounded-lg font-medium hover:bg-accent transition-colors">
              Ver Ficha Completa
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in-right {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
            animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in {
            animation: fadeIn 0.3s ease-in;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default PropertyMap;
