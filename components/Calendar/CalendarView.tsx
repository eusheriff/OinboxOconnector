

import React, { useState } from 'react';
import { Appointment } from '../../types';
import { MOCK_APPOINTMENTS } from '../../constants';
import { Calendar, Clock, MapPin, User, Plus, CheckCircle2, ChevronRight } from 'lucide-react';

const CalendarView: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Formatações de data
  const todayStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  
  // Gera dias do mês (simples)
  const daysInMonth = Array.from({length: 30}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d;
  });

  return (
    <div className="flex-1 bg-gray-50 p-8 overflow-y-auto h-full">
        <div className="max-w-6xl mx-auto h-full flex flex-col">
            
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Agenda do Corretor</h1>
                    <p className="text-slate-500 text-sm">Gerencie visitas, vistorias e reuniões.</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all">
                    <Plus className="w-5 h-5" /> Novo Agendamento
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
                
                {/* Coluna da Esquerda: Calendário Visual e Resumo */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-800">{new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
                            <div className="flex gap-1">
                                <button className="p-1 hover:bg-gray-100 rounded text-gray-500">{'<'}</button>
                                <button className="p-1 hover:bg-gray-100 rounded text-gray-500">{'>'}</button>
                            </div>
                        </div>
                        
                        {/* Mini Calendar Grid (Visual Only) */}
                        <div className="grid grid-cols-7 gap-1 text-center text-sm mb-2">
                            {['D','S','T','Q','Q','S','S'].map(d => <span key={d} className="text-gray-400 text-xs font-bold py-2">{d}</span>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center">
                            {Array.from({length: 31}, (_, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => setSelectedDate(new Date(new Date().setDate(i + 1)))}
                                    className={`p-2 rounded-lg text-sm font-medium transition-all ${
                                        i+1 === new Date().getDate() ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-100 text-slate-700'
                                    }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                        <h3 className="font-bold text-blue-800 mb-2">Próximo Compromisso</h3>
                        {appointments[0] ? (
                            <div>
                                <p className="text-lg font-bold text-slate-800 mb-1">{appointments[0].title}</p>
                                <div className="flex items-center gap-2 text-sm text-blue-700 mb-3">
                                    <Clock className="w-4 h-4" />
                                    {appointments[0].date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex -space-x-2">
                                        <div className="w-8 h-8 rounded-full bg-white border-2 border-blue-50 flex items-center justify-center text-xs font-bold text-slate-600">RS</div>
                                    </div>
                                    <button className="text-xs bg-white text-blue-600 px-3 py-1.5 rounded-md font-bold hover:bg-blue-100 transition-colors">
                                        Ver Detalhes
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-blue-600">Agenda livre hoje!</p>
                        )}
                    </div>
                </div>

                {/* Coluna da Direita: Lista de Eventos */}
                <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-800 text-lg">Eventos do Dia</h2>
                                <p className="text-xs text-gray-500">{todayStr}</p>
                            </div>
                        </div>
                        <select className="bg-white border border-gray-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
                            <option>Todos os Eventos</option>
                            <option>Apenas Visitas</option>
                            <option>Reuniões</option>
                        </select>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {/* Linha do Tempo Vertical */}
                        <div className="relative border-l-2 border-dashed border-gray-200 ml-4 space-y-8">
                            {appointments.map((apt, idx) => (
                                <div key={apt.id} className="relative pl-8 group cursor-pointer">
                                    {/* Bolinha da Linha do Tempo */}
                                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                                        idx === 0 ? 'bg-blue-600 animate-pulse' : 'bg-gray-300'
                                    }`}></div>

                                    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group-hover:translate-x-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                    apt.type === 'visit' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                                                }`}>
                                                    {apt.type === 'visit' ? 'Visita ao Imóvel' : 'Reunião'}
                                                </span>
                                                <span className="text-sm font-bold text-slate-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {apt.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                            </div>
                                            <button className="text-gray-300 hover:text-blue-600">
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <h3 className="text-lg font-bold text-slate-800 mb-1">{apt.title}</h3>
                                        
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-1.5">
                                                <User className="w-4 h-4" /> {apt.clientName}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-4 h-4" /> {apt.location}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {/* Empty State Placeholder */}
                            <div className="relative pl-8 opacity-50">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-200 border-2 border-white"></div>
                                <div className="border border-gray-100 rounded-xl p-4 border-dashed bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
                                    Fim dos agendamentos por hoje
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default CalendarView;