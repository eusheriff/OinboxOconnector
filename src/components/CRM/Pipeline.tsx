import React, { useState, useEffect } from 'react';
import { Lead } from '@shared/types';
import { MoreHorizontal, Plus, Calendar, DollarSign, Loader2 } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PipelineProps {
  onNavigateToChat?: (conversationId: string) => void;
}

// Status mapping for pipeline columns
const PIPELINE_COLUMNS = [
  { id: 'new', label: 'Novos Leads', color: 'border-blue-500', bg: 'bg-blue-50' },
  { id: 'qualified', label: 'Qualificados', color: 'border-yellow-500', bg: 'bg-yellow-50' },
  { id: 'contacted', label: 'Contatados', color: 'border-purple-500', bg: 'bg-purple-50' },
  { id: 'converted', label: 'Convertidos', color: 'border-green-500', bg: 'bg-green-50' },
];

// Draggable Lead Card Component
function DraggableLeadCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-card p-4 rounded-lg shadow-sm border border-border hover:shadow-md transition-all group cursor-grab active:cursor-grabbing"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            {lead.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">{lead.name}</p>
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              {lead.source || 'Manual'}
            </div>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600 z-10">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {lead.phone && <div className="text-xs text-gray-500 mb-2">📞 {lead.phone}</div>}

      {lead.score > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1 font-bold text-foreground text-sm">
            <DollarSign className="w-3 h-3 text-green-600" />
            Score: {lead.score}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <Calendar className="w-3 h-3" />
          {new Date(lead.capturedAt).toLocaleDateString('pt-BR')}
        </div>
        {lead.rating && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-bold">
            ★ {lead.rating}
          </span>
        )}
      </div>
    </div>
  );
}

// Droppable Column Component
function DroppableColumn({
  column,
  leads,
  total,
}: {
  column: (typeof PIPELINE_COLUMNS)[number];
  leads: Lead[];
  total: number;
}) {
  return (
    <div className="flex-1 flex flex-col min-w-[280px] h-full">
      {/* Column Header */}
      <div
        className={`p-3 rounded-t-xl bg-card border-t-4 ${column.color} shadow-sm mb-2 flex justify-between items-center`}
      >
        <div>
          <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">
            {column.label}
          </h3>
          <span className="text-xs text-gray-400 font-medium">{leads.length} leads</span>
        </div>
        <div className="text-xs font-bold text-muted-foreground bg-gray-100 px-2 py-1 rounded">
          {total > 0 ? `Score: ${total}` : '—'}
        </div>
      </div>

      {/* Cards Area - Droppable */}
      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div
          className="flex-1 bg-gray-200/50 rounded-xl p-2 overflow-y-auto space-y-3 min-h-[200px]"
          data-column={column.id}
        >
          {leads.map((lead) => (
            <DraggableLeadCard key={lead.id} lead={lead} />
          ))}
          {leads.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-8">Arraste leads aqui</div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

const Pipeline: React.FC<PipelineProps> = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  // Fetch leads from backend
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const token = localStorage.getItem('oinbox_token');
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/leads`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = (await response.json()) as { leads: Lead[] };
        setLeads(data.leads || []);
      } catch {
        // Fallback to empty if error
        setLeads([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, []);

  // Update lead status on backend
  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('oinbox_token');
      await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/leads/${leadId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        },
      );
    } catch {
      // Silent fail - optimistic update already done
    }
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end - move lead to new column
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Find which column was dropped on
    const overElement = document.querySelector(`[data-column]`);
    if (!overElement) return;

    // Get target column from the over element or its parent
    const targetColumn = (over.id as string).includes('-')
      ? null
      : PIPELINE_COLUMNS.find((col) => leads.find((l) => l.id === over.id && l.status === col.id))
          ?.id;

    // If dropped on another lead, get that lead's status
    const targetLead = leads.find((l) => l.id === over.id);
    const newStatus = targetLead?.status || targetColumn;

    if (newStatus && active.id !== over.id) {
      const leadToMove = leads.find((l) => l.id === active.id);
      if (leadToMove && leadToMove.status !== newStatus) {
        // Optimistic update
        setLeads((prev) =>
          prev.map((l) => (l.id === active.id ? { ...l, status: newStatus as Lead['status'] } : l)),
        );
        // Persist to backend
        updateLeadStatus(active.id as string, newStatus);
      }
    }
  };

  // Get leads by status
  const getLeadsByStatus = (status: string) => leads.filter((l) => l.status === status);

  // Calculate total score per column
  const calculateColumnTotal = (status: string) =>
    getLeadsByStatus(status).reduce((acc, curr) => acc + (curr.score || 0), 0);

  // Get active lead for overlay
  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-gray-500">Carregando pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-100 overflow-hidden">
      <div className="flex-1 flex flex-col w-full h-full max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="px-8 py-6 bg-card border-b border-border flex justify-between items-center flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pipeline de Vendas</h1>
            <p className="text-gray-500 text-sm">
              Arraste os leads entre as colunas para atualizar o status.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <span className="text-xs text-gray-500 uppercase font-bold">Total de Leads</span>
              <p className="text-xl font-bold text-foreground">{leads.length}</p>
            </div>
            <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
              <Plus className="w-4 h-4" /> Novo Lead
            </button>
          </div>
        </div>

        {/* Kanban Board with DnD */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
            <div className="flex h-full gap-6 min-w-[1000px]">
              {PIPELINE_COLUMNS.map((col) => (
                <DroppableColumn
                  key={col.id}
                  column={col}
                  leads={getLeadsByStatus(col.id)}
                  total={calculateColumnTotal(col.id)}
                />
              ))}
            </div>
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeLead ? (
              <div className="bg-card p-4 rounded-lg shadow-lg border-2 border-primary">
                <p className="font-bold text-sm">{activeLead.name}</p>
                <p className="text-xs text-gray-500">{activeLead.phone}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};

export default Pipeline;
