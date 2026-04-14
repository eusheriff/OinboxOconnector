import React, { useState, useEffect } from 'react';
import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api';
import WhatsAppBotManager from './WhatsAppBotManager';
import SettingsView from './SettingsView';
import QualificationView from './QualificationView';
import CampaignManager from './CampaignManager';

import { Tenant } from '@shared/types';
import { AppView } from '@/types/ui';
import { apiService } from '@/services/apiService';
import { MOCK_TENANTS } from '@/constants';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Activity,
  Server,
  LogOut,
  Search,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Building2,
  Database,
  Globe,
  MapPin,
  Star,
  MessageCircle,
  Megaphone,
  Inbox,
  BarChart3,
  Settings,
  UserCog,
  Target,
  Zap,
  Phone,
  Home,
  LayoutGrid,
  List,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SuperAdminLeadCaptureProps {
  onLogout: () => void;
}

// API Base URL - Hardcoded for Stability in Production (matches apiService.ts strategy)
const API_BASE = 'https://api.oinbox.oconnector.tech';

// Dados mock do funil - TODO: Fetch real stats
const mockFunnelData = {
  new: 245,
  qualified: 156,
  contacted: 89,
  responded: 34,
  converted: 12,
};

const LIBRARIES: 'places'[] = ['places'];

const SuperAdminLeadCapture: React.FC<SuperAdminLeadCaptureProps> = ({ onLogout }) => {
  const [activeView, setActiveView] = useState<AppView>(AppView.SUPER_ADMIN_OVERVIEW);
  const [tenants] = useState<Tenant[]>(MOCK_TENANTS);
  const [queryHasRun, setQueryHasRun] = useState(false);

  // Metrics
  const totalMRR = tenants.reduce((acc, t) => acc + t.mrr, 0);
  const activeTenants = tenants.filter((t) => t.status === 'Active').length;

  const menuItems = [
    { view: AppView.SUPER_ADMIN_OVERVIEW, icon: LayoutDashboard, label: 'Dashboard', badge: null },
    { view: AppView.SUPER_ADMIN_GOOGLE_PLACES, icon: MapPin, label: 'Google Places', badge: null },
    { view: AppView.SUPER_ADMIN_LEADS, icon: Users, label: 'Gerenciar Leads', badge: null },
    { view: AppView.SUPER_ADMIN_QUALIFICATION, icon: Star, label: 'Qualificação', badge: null },
    {
      view: AppView.SUPER_ADMIN_WHATSAPP_BOT,
      icon: MessageCircle,
      label: 'Bot WhatsApp',
      badge: null,
    },
    { view: AppView.SUPER_ADMIN_CAMPAIGNS, icon: Megaphone, label: 'Campanhas', badge: null },
    { view: AppView.SUPER_ADMIN_INBOX, icon: Inbox, label: 'Inbox Omnichannel', badge: null },
    { view: AppView.SUPER_ADMIN_ANALYTICS, icon: BarChart3, label: 'Analytics', badge: null },
    { view: AppView.SUPER_ADMIN_SETTINGS, icon: Settings, label: 'Configurações', badge: null },
    { view: AppView.SUPER_ADMIN_FINANCE, icon: CreditCard, label: 'Faturamento', badge: null },
    { view: AppView.SUPER_ADMIN_USERS, icon: UserCog, label: 'Usuários', badge: null },
    // Enterprise - Leads de Compradores
    {
      view: AppView.SUPER_ADMIN_BUYER_LEADS,
      icon: Home,
      label: '� Leads Compradores',
      badge: null,
    },
  ];

  const renderSidebar = () => (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col h-screen">
      <div className="p-6 flex items-center gap-3 border-b border-border">
        <div className="bg-primary p-2 rounded-lg shadow-lg shadow-primary/20">
          <Target className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <span className="font-bold text-lg tracking-tight block">Lead Engine</span>
          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">
            Super Admin
          </span>
        </div>
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-1 px-3 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.view}
            onClick={() => setActiveView(item.view)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm ${
              activeView === item.view
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <item.icon className="w-4 h-4" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className="px-2 py-0.5 bg-purple-500/30 text-purple-300 text-xs rounded-full font-bold">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="bg-card rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-slate-300 font-bold">Hoje</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-muted-foreground">Novos Leads</span>
              <p className="text-green-400 font-bold">+23</p>
            </div>
            <div>
              <span className="text-muted-foreground">Respostas</span>
              <p className="text-blue-400 font-bold">+8</p>
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-red-400 w-full rounded-lg hover:bg-accent transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );

  const renderFunnelDashboard = () => (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">� Funil de Captação</h1>

      {/* Funil Visual */}
      <div className="bg-card p-6 rounded-xl border border-border shadow-sm mb-8">
        <h3 className="font-bold text-foreground mb-4">Pipeline de Leads</h3>
        <div className="flex items-end justify-between h-48 gap-2">
          {Object.entries(mockFunnelData).map(([stage, count], idx) => {
            const colors = [
              'bg-[hsl(var(--chart-1))]',
              'bg-[hsl(var(--chart-2))]',
              'bg-[hsl(var(--chart-3))]',
              'bg-[hsl(var(--chart-4))]',
              'bg-[hsl(var(--chart-5))]',
            ];
            const labels = ['Novos', 'Qualificados', 'Contatados', 'Responderam', 'Convertidos'];
            const maxHeight = Math.max(...Object.values(mockFunnelData));
            const height = (count / maxHeight) * 100;

            return (
              <div key={stage} className="flex-1 flex flex-col items-center">
                <span className="text-lg font-bold text-foreground mb-2">{count}</span>
                <div
                  className={`w-full ${colors[idx]} rounded-t-lg transition-all`}
                  style={{ height: `${height}%`, minHeight: '20px' }}
                />
                <span className="text-xs text-muted-foreground mt-2 text-center">
                  {labels[idx]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <p className="text-xs font-bold text-muted-foreground uppercase mb-1">
            Taxa de Conversão
          </p>
          <h3 className="text-3xl font-bold text-foreground">4.9%</h3>
          <p className="text-xs text-muted-foreground mt-2">12 de 245 leads</p>
        </div>
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Taxa de Resposta</p>
          <h3 className="text-3xl font-bold text-foreground">38.2%</h3>
          <p className="text-xs text-muted-foreground mt-2">34 de 89 contatos</p>
        </div>
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Score Médio</p>
          <h3 className="text-3xl font-bold text-foreground">72</h3>
          <p className="text-xs text-muted-foreground mt-2">Leads qualificados</p>
        </div>
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Campanhas Ativas</p>
          <h3 className="text-3xl font-bold text-foreground">3</h3>
          <p className="text-xs text-muted-foreground mt-2">89 mensagens pendentes</p>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => setActiveView(AppView.SUPER_ADMIN_GOOGLE_PLACES)}
          className="bg-card border border-primary/20 p-6 rounded-xl text-left hover:shadow-lg transition-all group"
        >
          <MapPin className="w-8 h-8 mb-3 text-primary" />
          <h3 className="font-bold text-lg text-foreground">Buscar Novos Leads</h3>
          <p className="text-muted-foreground text-sm mt-1">Capturar PMEs via Google Places</p>
        </button>
        <button
          onClick={() => setActiveView(AppView.SUPER_ADMIN_CAMPAIGNS)}
          className="bg-card border border-primary/20 p-6 rounded-xl text-left hover:shadow-lg transition-all group"
        >
          <Megaphone className="w-8 h-8 mb-3 text-primary" />
          <h3 className="font-bold text-lg text-foreground">Nova Campanha</h3>
          <p className="text-muted-foreground text-sm mt-1">Criar campanha de outreach</p>
        </button>
        <button
          onClick={() => setActiveView(AppView.SUPER_ADMIN_INBOX)}
          className="bg-card border border-primary/20 p-6 rounded-xl text-left hover:shadow-lg transition-all group"
        >
          <Inbox className="w-8 h-8 mb-3 text-primary" />
          <h3 className="font-bold text-lg text-foreground">12 Novas Mensagens</h3>
          <p className="text-muted-foreground text-sm mt-1">Ver inbox omnichannel</p>
        </button>
      </div>
    </div>
  );

  // Google Places Implementation
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '',
    libraries: LIBRARIES,
  });

  const [places, setPlaces] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('Valparaíso de Goiás - GO');
  const [searchRadius, setSearchRadius] = useState(10);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [autoProcess, setAutoProcess] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);

  useEffect(() => {
    fetchQuota();
  }, []);

  const fetchQuota = async () => {
    try {
      // Import apiService at the top first!
      // Wait, I need to check imports. I will do imports in a separate block or include it here if allowing multiple.
      // Let's assume I adding import in a separate tool call or same if contiguous.
      // Actually, I can use AllowMultiple to add import and fix calls.

      const res = await fetch(`${API_BASE}/api/places/usage`, {
        headers: apiService.getHeaders(),
      });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data: any = await res.json();
      if (data.limit) setQuota(data);
    } catch (e) {
      console.warn('Failed to fetch quota:', e);
    }
  };

  // Default center: Valparaíso de Goiás
  const defaultCenter = { lat: -16.0664, lng: -47.9758 };

  useEffect(() => {
    if (isLoaded && !placesService && map) {
      // Use the map instance for the PlacesService to allow attribution on map if needed
      // Actually standard TextSearch doesn't require map if we don't display it, but here we do.
      const service = new google.maps.places.PlacesService(map);
      setPlacesService(service);
    }
  }, [isLoaded, placesService, map]);

  const processLeads = async (placesToImport: any[]) => {
    setProcessingStatus('Importing leads...');
    try {
      // 1. Import
      const importRes = await fetch(`${API_BASE}/api/places/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...apiService.getHeaders(),
        },
        body: JSON.stringify({
          places: placesToImport,
          searchQuery: `${searchQuery} in ${searchLocation}`,
        }),
      });
      const importData: any = await importRes.json();
      if (!importData.success) throw new Error('Import failed');

      if (!autoProcess) {
        setProcessingStatus(`Imported ${importData.imported} leads!`);
        setTimeout(() => setProcessingStatus(''), 3000);
        return;
      }

      const newLeadIds = importData.leadIds || [];
      if (newLeadIds.length === 0) {
        setProcessingStatus('No new leads to process.');
        setTimeout(() => setProcessingStatus(''), 3000);
        return;
      }

      // 2. Qualify
      setProcessingStatus(`Qualifying ${newLeadIds.length} leads...`);

      const qualifyRes = await fetch(`${API_BASE}/api/leads/qualify`, {
        method: 'POST',
        headers: apiService.getHeaders(),
        body: JSON.stringify({ leadIds: newLeadIds }),
      });
      const qualifyData: any = await qualifyRes.json();
      if (!qualifyData.success) throw new Error('Qualification failed');

      // 3. Generate Pitch (Analyze) for each
      setProcessingStatus(`Generating pitches for ${newLeadIds.length} leads...`);
      let processed = 0;

      // Execute pitch generation in parallel bundles to speed up but not overwhelm
      const chunkSize = 5;
      for (let i = 0; i < newLeadIds.length; i += chunkSize) {
        const chunk = newLeadIds.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (id: string) => {
            try {
              await fetch(`${API_BASE}/api/leads/${id}/analyze`, {
                method: 'POST',
                headers: apiService.getHeaders(),
              });
            } catch (e) {
              console.warn(`Failed to analyze lead ${id}`, e);
            }
          }),
        );
        processed += chunk.length;
        setProcessingStatus(
          `Generating pitches... ${Math.min(processed, newLeadIds.length)}/${newLeadIds.length}`,
        );
      }

      setProcessingStatus('Auto-processing complete! �');
      setTimeout(() => setProcessingStatus(''), 5000);
    } catch (error) {
      console.error('Processing error:', error);
      setProcessingStatus('Error processing leads');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) return;

    // Check quota before searching
    if (quota && quota.used >= quota.limit) {
      alert('Limite mensal de buscas atingido! Contate o suporte.');
      return;
    }

    setIsSearching(true);

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...apiService.getHeaders(),
      };
      console.log('� [DEBUG] Search request headers:', headers);

      const response = await fetch(`${API_BASE}/api/places/search`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          query: searchQuery,
          location: searchLocation,
          radius: searchRadius * 1000, // Convert km to meters
        }),
      });

      const data: any = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          alert(data.error || 'Limite de cota excedido.');
        } else {
          console.error('Search failed:', data.error);
          alert('Erro na busca: ' + data.error);
        }
        setPlaces([]);
        setIsSearching(false);
        return;
      }

      setQueryHasRun(true);
      if (data.results) {
        setPlaces(data.results);

        // Update map bounds
        if (map && data.results.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          data.results.forEach((place: any) => {
            if (place.geometry && place.geometry.location) {
              bounds.extend(place.geometry.location);
            }
          });
          map.fitBounds(bounds);
        }

        // Update local quota
        if (data.usage) {
          setQuota(data.usage);
        } else {
          fetchQuota();
        }

        // Auto Import Logic
        if (data.results.length > 0) {
          processLeads(data.results);
        }
      } else {
        setPlaces([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setPlaces([]);
    } finally {
      setIsSearching(false);
    }
  };

  const renderGooglePlaces = () => (
    <div className="p-8 h-full flex flex-col">
      <h1 className="text-2xl font-bold text-foreground mb-6">� Busca Google Places - Maps</h1>

      <div className="bg-card p-6 rounded-xl border border-border shadow-sm mb-6 flex-shrink-0">
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Buscar por
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="imobiliária, corretor de imóveis..."
              className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring outline-none bg-background text-foreground"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Localização
            </label>
            <input
              type="text"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              placeholder="Ex: Valparaíso de Goiás - GO"
              className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring outline-none bg-background text-foreground"
            />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Raio (km)
            </label>
            <input
              type="number"
              value={searchRadius}
              onChange={(e) => setSearchRadius(Number(e.target.value))}
              className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring outline-none bg-background text-foreground"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={handleSearch}
            disabled={!isLoaded || isSearching}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSearching ? (
              <Activity className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>

          {quota && (
            <div
              className={`text-xs font-bold px-3 py-1 rounded-full border ${
                quota.used >= quota.limit
                  ? 'bg-red-100 text-red-700 border-red-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              Cota Mensal: {quota.used} / {quota.limit}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoProcess"
              checked={autoProcess}
              onChange={(e) => setAutoProcess(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="autoProcess" className="text-sm text-foreground">
              Auto-processar com IA (Importar - Qualificar - Gerar Pitch)
            </label>
          </div>
        </div>

        {processingStatus && (
          <div className="mt-4 text-sm text-blue-500 font-medium animate-pulse">
            {processingStatus}
          </div>
        )}
      </div>

      {!import.meta.env.VITE_GOOGLE_PLACES_API_KEY && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive text-sm mb-6">
          <strong>�� Erro:</strong> `VITE_GOOGLE_PLACES_API_KEY` não configurada no .env
        </div>
      )}

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Results List */}
        <div className="w-1/3 overflow-y-auto pr-2 space-y-4">
          {places.length > 0
            ? places.map((place) => (
                <div
                  key={place.place_id}
                  className="bg-card p-4 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow flex justify-between items-center group cursor-pointer"
                  onClick={() => {
                    if (map && place.geometry && place.geometry.location) {
                      map.panTo(place.geometry.location);
                      map.setZoom(15);
                    }
                  }}
                >
                  <div className="flex gap-4 items-start">
                    <div className="bg-muted p-2 rounded-lg h-fit">
                      {place.icon ? (
                        <img src={place.icon} className="w-6 h-6" alt="" />
                      ) : (
                        <MapPin className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                        {place.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{place.formatted_address}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground font-medium flex items-center gap-1">
                          � {place.rating} ({place.user_ratings_total})
                        </span>
                        {place.business_status && (
                          <span className="text-xs border border-border px-2 py-0.5 rounded text-muted-foreground">
                            {place.business_status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            : queryHasRun && (
                <div className="text-center py-10 text-muted-foreground">
                  <p>Nenhum resultado encontrado em {searchLocation}.</p>
                </div>
              )}
        </div>

        {/* Map Container */}
        <div className="flex-1 bg-muted rounded-xl border border-border overflow-hidden relative">
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={defaultCenter}
              zoom={13}
              onLoad={(map) => setMap(map)}
              options={{
                styles: [
                  {
                    featureType: 'all',
                    elementType: 'geometry',
                    stylers: [{ color: '#242f3e' }],
                  },
                  {
                    featureType: 'all',
                    elementType: 'labels.text.stroke',
                    stylers: [{ color: '#242f3e' }],
                  },
                  {
                    featureType: 'all',
                    elementType: 'labels.text.fill',
                    stylers: [{ color: '#746855' }],
                  },
                ],
              }}
            >
              {places.map(
                (place) =>
                  place.geometry &&
                  place.geometry.location && (
                    <Marker
                      key={place.place_id}
                      position={place.geometry.location}
                      title={place.name}
                      onClick={() => {
                        // Handle marker click (e.g., show info window)
                      }}
                    />
                  ),
              )}
            </GoogleMap>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Carregando mapa...
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Placeholder to remove the inline function
  // logic moved to BuyerLeadsAdmin component below

  const renderPlaceholder = (title: string, emoji: string, description: string) => (
    <div className="flex items-center justify-center h-full text-gray-400">
      <div className="text-center">
        <span className="text-6xl mb-4 block">{emoji}</span>
        <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case AppView.SUPER_ADMIN_OVERVIEW:
        return renderFunnelDashboard();
      case AppView.SUPER_ADMIN_GOOGLE_PLACES:
        return renderGooglePlaces();
      case AppView.SUPER_ADMIN_LEADS:
        return <LeadsManager />;
      case AppView.SUPER_ADMIN_QUALIFICATION:
        return <QualificationView />;
      case AppView.SUPER_ADMIN_WHATSAPP_BOT:
        return <WhatsAppBotManager />;
      case AppView.SUPER_ADMIN_CAMPAIGNS:
        return <CampaignManager />;
      case AppView.SUPER_ADMIN_INBOX:
        return renderPlaceholder(
          'Inbox Omnichannel',
          '�',
          'Gerencie todas as conversas em um só lugar',
        );
      case AppView.SUPER_ADMIN_ANALYTICS:
        return renderPlaceholder('Analytics', '�', 'Visualize KPIs e métricas de ROI');
      case AppView.SUPER_ADMIN_SETTINGS:
        return <SettingsView />;
      case AppView.SUPER_ADMIN_FINANCE:
        return renderPlaceholder('Faturamento', '�', 'Visualize assinaturas e receita');
      case AppView.SUPER_ADMIN_USERS:
        return renderPlaceholder('Gestão de Usuários', '�', 'Gerencie acessos e permissões');
      case AppView.SUPER_ADMIN_BUYER_LEADS:
        return <BuyerLeadsAdmin />;
      default:
        return renderFunnelDashboard();
    }
  };

  return (
    <div className="flex h-screen bg-background font-sans">
      {renderSidebar()}
      <main className="flex-1 overflow-y-auto">{renderContent()}</main>
    </div>
  );
};

export default SuperAdminLeadCapture;

// ----------------------------------------------------------------------
// EXTRACTED COMPONENTS (Kanban & Fix Hook Rules)
// ----------------------------------------------------------------------

const KanbanCard = ({ lead }: { lead: any }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: lead.id,
    data: lead,
  });

  const style: React.CSSProperties | undefined = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 100,
        position: 'relative',
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing mb-3"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="font-semibold text-sm text-foreground truncate">{lead.name}</span>
        <div className="flex gap-1">
          {lead.priority && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{lead.address || 'Sem endereço'}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Phone className="w-3 h-3" />
          <span>{lead.phone || 'N/A'}</span>
        </div>
        {lead.rating && (
          <div className="flex items-center gap-1 text-xs text-yellow-600 mt-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-500" />
            <span>{lead.rating}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const KanbanColumn = ({
  id,
  title,
  leads,
  count,
}: {
  id: string;
  title: string;
  leads: any[];
  count: number;
}) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className="flex-1 min-w-[280px] bg-gray-50/50 rounded-xl border border-gray-100 flex flex-col h-full max-h-[calc(100vh-220px)]"
    >
      <div className="p-3 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-gray-50/95 backdrop-blur z-10 rounded-t-xl">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-tight">{title}</h3>
          <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full text-xs font-bold text-gray-500">
            {count}
          </span>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
      <div className="p-3 overflow-y-auto flex-1 custom-scrollbar">
        {leads.length === 0 ? (
          <div className="h-24 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-400">
            Vazio
          </div>
        ) : (
          leads.map((lead) => <KanbanCard key={lead.id} lead={lead} />)
        )}
      </div>
    </div>
  );
};

const LeadsManager = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setIsLoadingLeads(true);
    try {
      const res = await fetch(`${API_BASE}/api/leads?limit=100`, {
        headers: apiService.getHeaders(),
      }); // Increase limit for Kanban
      const data: any = await res.json();
      if (data.leads) setLeads(data.leads);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const leadId = active.id;
      const newStatus = over.id; // Droppable ID is the status column

      // Optimistic update
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));

      // API Update
      try {
        await fetch(`${API_BASE}/api/leads/${leadId}`, {
          method: 'PUT',
          headers: apiService.getHeaders(),
          body: JSON.stringify({ status: newStatus }),
        });
      } catch (error) {
        console.error('Failed to update status', error);
        fetchLeads(); // Revert on error
      }
    }
  };

  const handleAiAction = async (leadId: string, action: 'analyze' | 'qualify') => {
    if (action === 'analyze') {
      const res = await fetch(`${API_BASE}/api/leads/${leadId}/analyze`, {
        method: 'POST',
        headers: apiService.getHeaders(),
      });
      const data: any = await res.json();
      if (data.success) {
        alert(`Pitch Generated:\n${data.pitch}`);
        fetchLeads();
      }
    }
  };

  const columns = [
    { id: 'new', title: 'Novos Leads' },
    { id: 'qualified', title: 'Qualificados' },
    { id: 'contacted', title: 'Contatados' },
    { id: 'responded', title: 'Responderam' },
    { id: 'converted', title: 'Convertidos' }, // Added converted column
  ];

  // Group leads by status
  const getLeadsByStatus = (status: string) => leads.filter((l) => (l.status || 'new') === status);

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            � Gerenciar Leads
            <span className="text-xs font-normal bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
              Autônomo
            </span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Visualize e gerencie seu pipeline de vendas
          </p>
        </div>

        <div className="flex gap-2">
          <div className="bg-gray-100 p-1 rounded-lg flex border border-gray-200">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <button onClick={fetchLeads} className="p-2 border rounded-lg hover:bg-gray-50 bg-white">
            <Activity className="w-4 h-4" />
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none w-64"
            />
          </div>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 h-full items-start">
            {columns.map((col) => (
              <KanbanColumn
                key={col.id}
                id={col.id}
                title={col.title}
                leads={getLeadsByStatus(col.id)}
                count={getLeadsByStatus(col.id).length}
              />
            ))}
          </div>
          <DragOverlay>{/* Optional: Add drag overlay customization here */}</DragOverlay>
        </DndContext>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex-1 overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Nome</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Tipo</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Contato</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Rating</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoadingLeads ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center">
                    Carregando...
                  </td>
                </tr>
              ) : (
                leads.map((lead, idx) => (
                  <tr key={lead.id || idx} className="hover:bg-gray-50 cursor-pointer">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <span className="font-medium text-foreground block">{lead.name}</span>
                          <span className="text-xs text-muted-foreground">{lead.address}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{lead.type || 'PME'}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {lead.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1 text-sm">� {lead.rating}</span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 text-xs font-bold rounded-md ${
                          lead.status === 'responded'
                            ? 'bg-green-100 text-green-700'
                            : lead.status === 'contacted'
                              ? 'bg-blue-100 text-blue-700'
                              : lead.status === 'qualified'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {lead.status === 'responded'
                          ? 'Respondeu'
                          : lead.status === 'contacted'
                            ? 'Contatado'
                            : lead.status === 'qualified'
                              ? 'Qualificado'
                              : lead.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => handleAiAction(lead.id, 'analyze')}
                          className="p-1 hover:bg-purple-100 rounded text-purple-600"
                          title="Gerar Pitch IA"
                        >
                          <Zap className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const BuyerLeadsAdmin = () => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    interest_type: 'compra',
    property_type: 'casa',
    city: '',
    neighborhood: '',
    budget_min: '',
    budget_max: '',
    bedrooms: '',
    notes: '',
  });

  const mockBuyerLeads = [
    {
      id: '1',
      name: 'João Silva',
      phone: '(11) 99999-1234',
      interest_type: 'compra',
      property_type: 'casa',
      city: 'São Paulo',
      budget_max: 500000,
      ai_score: 85,
      status: 'available',
    },
    {
      id: '2',
      name: 'Maria Santos',
      phone: '(11) 98888-5678',
      interest_type: 'aluguel',
      property_type: 'apartamento',
      city: 'São Paulo',
      budget_max: 3000,
      ai_score: 72,
      status: 'available',
    },
  ];

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">� Leads de Compradores</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          {showForm ? 'Cancelar' : '+ Adicionar Lead'}
        </button>
      </div>
      {/* Simplified Viewer for Restoration - Full code in original */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Nome</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Interesse</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Budget</th>
            </tr>
          </thead>
          <tbody>
            {mockBuyerLeads.map((lead) => (
              <tr key={lead.id} className="border-b border-gray-50">
                <td className="p-4">{lead.name}</td>
                <td className="p-4">{lead.interest_type}</td>
                <td className="p-4">{lead.budget_max}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4 text-center text-sm text-gray-500 bg-gray-50">Demo Version</div>
      </div>
    </div>
  );
};
