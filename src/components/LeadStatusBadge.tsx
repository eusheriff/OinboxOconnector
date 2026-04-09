import { Badge } from './UI/badge';

interface LeadStatusBadgeProps {
  status: string;
}

const statusMap: Record<string, { label: string; className: string }> = {
  new: { label: 'Novo', className: 'bg-green-500 hover:bg-green-600' },
  contacted: { label: 'Em Contato', className: 'bg-blue-500 hover:bg-blue-600' },
  responded: { label: 'Respondido', className: 'bg-purple-500 hover:bg-purple-600' },
  qualified: { label: 'Qualificado', className: 'bg-yellow-500 hover:bg-yellow-600' },
  converted: { label: 'Converteu', className: 'bg-emerald-600 hover:bg-emerald-700' },
  rejected: { label: 'Rejeitado', className: 'bg-red-500 hover:bg-red-600' },
  default: { label: 'Desconhecido', className: 'bg-gray-500' },
};

export function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  const config = statusMap[status] || statusMap.default;

  return <Badge className={`${config.className} text-white border-0`}>{config.label}</Badge>;
}
