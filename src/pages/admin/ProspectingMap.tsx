import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { apiService } from '../../../services/apiService';
import { Search, Save, Bot, Loader2, MapPin } from 'lucide-react';
import L from 'leaflet';

// Fix Leaflet Default Icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Subcomponente para recentralizar o mapa
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  map.setView([lat, lng], map.getZoom());
  return null;
}

export default function ProspectingMap() {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Array<{
    place_id: string;
    name: string;
    address?: string;
    rating?: number;
    website?: string;
    geometry?: { location: { lat: number; lng: number } };
  }>>([]);
  const [loading, setLoading] = useState(false);
  // Map Google Place ID -> DB ID
  const [savedLeads, setSavedLeads] = useState<Record<string, string>>({});
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  
  // Default Center (São Paulo)
  const [center, setCenter] = useState({ lat: -23.550520, lng: -46.633308 });

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setPlaces([]); // Limpar anteriores
    try {
      const data = await apiService.searchLeads(query);
      if (data.results && data.results.length > 0) {
        setPlaces(data.results);
        const first = data.results[0];
        if (first.geometry?.location) {
          setCenter(first.geometry.location);
        }
      }
    } catch {
      // Search failed - user gets visual feedback from empty results
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLead = async (place: typeof places[number]) => {
    setSavingId(place.place_id);
    try {
      const res = await apiService.saveLead({
        google_place_id: place.place_id,
        name: place.name,
        address: place.address,
        rating: place.rating,
        website: place.website
      });
      const result = res as { id?: string };
      if (result?.id) {
          setSavedLeads(prev => ({ ...prev, [place.place_id]: result.id! }));
          // Success - lead saved
      }
    } catch {
      // Error saving lead - continue silently
    } finally {
      setSavingId(null);
    }
  };

  const handleAnalyze = async (placeId: string) => {
      const dbId = savedLeads[placeId];
      if (!dbId) return; // Lead not saved yet
      
      setAnalyzingId(placeId);
      try {
          const res = await apiService.analyzeLead(dbId) as { pitch?: string };
          if (res.pitch) {
              // Pitch generated successfully - could show in UI
              void res.pitch;
          }
      } catch {
          // Analysis failed - continue silently
      } finally {
          setAnalyzingId(null);
      }
  };

  const handleInvite = async (placeId: string) => {
    const dbId = savedLeads[placeId];
    if (!dbId) return;

    // User should use UI confirmation modal instead
    // Skipping confirm() for now - would need state management

    setInvitingId(placeId);
    try {
        await apiService.inviteLead(dbId);
        // Invite sent successfully
    } catch {
        // Invite failed - continue silently
    } finally {
        setInvitingId(null);
    }
  };

  /* ... render logic ... */


  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Header de Busca */}
      <div className="p-4 bg-white border-b shadow-sm z-20 flex gap-4 items-center">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="text-indigo-600" />
            Radar de Prospecção
        </h2>
        <div className="flex-1 max-w-xl relative flex items-center">
            <input 
                type="text" 
                className="w-full pl-4 pr-12 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ex: Imobiliárias em Moema, SP"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button 
                onClick={handleSearch}
                disabled={loading}
                className="absolute right-2 p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Lista Lateral */}
        <div className="w-1/3 bg-white border-r overflow-y-auto p-4 space-y-4 shadow-xl z-20">
            <h3 className="font-semibold text-gray-500 text-sm uppercase tracking-wide">
                {places.length} Resultados Encontrados
            </h3>
            
            {places.map((place) => (
                <div key={place.place_id} className="p-4 border rounded-lg hover:border-indigo-300 hover:shadow-md transition-all bg-white group">
                    <div className="flex justify-between items-start">
                        <h4 className="font-bold text-gray-800">{place.name}</h4>
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                            ★ {place.rating || 'N/A'}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{place.address}</p>
                    
                    <div className="mt-3 flex gap-2">
                        {!savedLeads[place.place_id] ? (
                            <button 
                                onClick={() => handleSaveLead(place)}
                                disabled={savingId === place.place_id}
                                className="flex-1 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium flex items-center justify-center gap-2"
                            >
                                {savingId === place.place_id ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3" />}
                                Salvar
                            </button>
                        ) : (
                            <>
                                <button 
                                    onClick={() => handleAnalyze(place.place_id)}
                                    disabled={analyzingId === place.place_id}
                                    className="flex-1 py-1.5 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 rounded font-medium flex items-center justify-center gap-2"
                                >
                                    {analyzingId === place.place_id ? <Loader2 className="w-3 h-3 animate-spin"/> : <Bot className="w-3 h-3" />}
                                    Analisar
                                </button>
                                <button 
                                    onClick={() => handleInvite(place.place_id)}
                                    disabled={invitingId === place.place_id}
                                    className="flex-1 py-1.5 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded font-medium flex items-center justify-center gap-2"
                                >
                                    {invitingId === place.place_id ? <Loader2 className="w-3 h-3 animate-spin"/> : 'Convidar'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            ))}

            {places.length === 0 && !loading && (
                <div className="text-center py-10 text-gray-400">
                    <Search className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>Faça uma busca para encontrar leads.</p>
                </div>
            )}
        </div>

        {/* Mapa */}
        <div className="flex-1 relative z-10">
            <MapContainer center={[center.lat, center.lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <RecenterMap lat={center.lat} lng={center.lng} />
                
                {places.filter(p => p.geometry?.location).map(place => (
                    <Marker 
                        key={place.place_id} 
                        position={[place.geometry!.location.lat, place.geometry!.location.lng]}
                    >
                        <Popup>
                            <strong>{place.name}</strong><br/>
                            {place.address}<br/>
                            Rating: {place.rating}
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
      </div>
    </div>
  );
}
