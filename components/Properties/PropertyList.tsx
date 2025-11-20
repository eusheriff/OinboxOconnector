
import React from 'react';
import { Property } from '../../types';
import { Search, Plus, MapPin, MoreHorizontal, BedDouble, Trash2, Edit } from 'lucide-react';

interface PropertyListProps {
  properties: Property[];
  onNavigateToCreate: () => void;
  onDeleteProperty: (id: string) => void;
}

const PropertyList: React.FC<PropertyListProps> = ({ properties, onNavigateToCreate, onDeleteProperty }) => {
  return (
    <div className="flex-1 bg-gray-50 p-8 overflow-y-auto h-full">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Meus Imóveis</h1>
            <p className="text-gray-500 text-sm">Gerencie seu portfólio de vendas e aluguel.</p>
          </div>
          <button 
            onClick={onNavigateToCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
          >
            <Plus className="w-5 h-5" /> Novo Anúncio (IA)
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por título, bairro ou valor..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <select className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm text-slate-600 focus:outline-none">
            <option>Todos os Status</option>
            <option>Ativos</option>
            <option>Vendidos</option>
            <option>Pendentes</option>
          </select>
          <select className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm text-slate-600 focus:outline-none">
            <option>Preço: Maior para Menor</option>
            <option>Preço: Menor para Maior</option>
            <option>Mais Recentes</option>
          </select>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {properties.map((property) => (
            <div key={property.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all group">
              {/* Image */}
              <div className="h-48 relative bg-gray-200">
                <img src={property.image} alt={property.title} className="w-full h-full object-cover" />
                <div className="absolute top-3 right-3 flex gap-2">
                   <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                     property.status === 'Pending' ? 'bg-yellow-500 text-white' : 
                     property.status === 'Sold' ? 'bg-red-500 text-white' : 
                     'bg-green-500 text-white'
                   }`}>
                     {property.status || 'Active'}
                   </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <p className="text-white font-bold text-lg">R$ {property.price.toLocaleString('pt-BR')}</p>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-slate-800 mb-1 line-clamp-1">{property.title}</h3>
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{property.location}</span>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {property.features.slice(0, 2).map((feat, i) => (
                    <span key={i} className="bg-gray-50 text-gray-600 px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1">
                      <BedDouble className="w-3 h-3" /> {feat}
                    </span>
                  ))}
                  {property.features.length > 2 && (
                    <span className="bg-gray-50 text-gray-600 px-2 py-1 rounded text-[10px] font-medium">
                      +{property.features.length - 2}
                    </span>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <button className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    <Edit className="w-4 h-4" /> Editar
                  </button>
                  <button 
                    onClick={() => onDeleteProperty(property.id)}
                    className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PropertyList;
