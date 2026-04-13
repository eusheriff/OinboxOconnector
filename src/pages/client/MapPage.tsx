import React from 'react';
import { Map as MapIcon, Navigation } from 'lucide-react';

export default function MapPage() {
  return (
    <div className="h-full flex flex-col relative bg-gray-100">
      {/* Map Placeholder */}
      <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
        <div className="text-center text-gray-500">
          <MapIcon size={64} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Mapa Interativo</p>
          <p className="text-sm">Integração com Google Maps em breve</p>
        </div>
      </div>

      {/* Overlay Controls */}
      <div className="absolute top-6 left-6 z-10 bg-white p-4 rounded-xl shadow-lg border border-gray-200 w-80">
        <h1 className="text-lg font-bold text-gray-900 mb-2">Explorar Imóveis</h1>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Buscar região..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-2">
            <button className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
              Buscar
            </button>
            <button className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
              <Navigation size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Property Pins (Mock) */}
      <div className="absolute top-1/3 left-1/4 transform -translate-x-1/2 -translate-y-1/2 z-0">
        <div className="relative group cursor-pointer">
          <div className="w-8 h-8 bg-primary rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white">
            <HomeIcon size={14} />
          </div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-white p-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <img
              src="https://placehold.co/150x100"
              alt="Property"
              className="w-full h-24 object-cover rounded-md mb-2"
            />
            <p className="font-bold text-sm">Apartamento Centro</p>
            <p className="text-primary text-xs font-bold">R$ 450.000</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
  );
}
