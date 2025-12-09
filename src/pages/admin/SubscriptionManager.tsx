import React, { useEffect, useState } from 'react';
import { CreditCard, Check, ExternalLink } from 'lucide-react';

interface Plan {
    id: string;
    name: string;
    amount: number;
    currency: string;
    interval: string;
}

const SubscriptionManager: React.FC = () => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/billing/plans`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('oconnector_token')}` }
            });
            const data = await response.json() as any;
            if (data.error) throw new Error(data.error);
            setPlans(Array.isArray(data) ? data : []);
        } catch (error: any) {
            console.error("Failed to fetch plans", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleManageSubscription = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/billing/portal`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('oconnector_token')}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json() as any;
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert('Erro ao abrir portal: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            alert('Erro ao conectar com Stripe');
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                    <CreditCard className="text-yellow-400" />
                    Gerenciamento de Assinaturas
                </h2>
                <button
                    onClick={handleManageSubscription}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                    <ExternalLink size={20} /> Portal do Cliente Stripe
                </button>
            </div>

            {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg">
                    Erro ao carregar planos: {error}. Verifique a configuração do Stripe.
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <div key={plan.id} className="bg-card p-6 rounded-xl border border-border flex flex-col">
                        <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                        <div className="text-3xl font-bold text-blue-400 mb-4">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: plan.currency.toUpperCase() }).format(plan.amount)}
                            <span className="text-sm text-gray-400 font-normal">/{plan.interval}</span>
                        </div>
                        <ul className="space-y-2 mb-6 flex-1">
                            <li className="flex items-center gap-2 text-gray-300">
                                <Check size={16} className="text-green-400" /> Acesso completo
                            </li>
                            <li className="flex items-center gap-2 text-gray-300">
                                <Check size={16} className="text-green-400" /> Suporte prioritário
                            </li>
                        </ul>
                        <button className="w-full bg-primary hover:bg-primary/90 text-white py-2 rounded-lg transition-colors">
                            Editar Plano
                        </button>
                    </div>
                ))}
                {plans.length === 0 && !loading && !error && (
                    <div className="col-span-3 text-center text-gray-500 py-12">
                        Nenhum plano encontrado no Stripe.
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubscriptionManager;
