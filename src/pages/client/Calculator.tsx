import React, { useState, useEffect } from 'react';
import { Calculator as CalcIcon, DollarSign, Percent, Calendar } from 'lucide-react';

export default function Calculator() {
    const [values, setValues] = useState({
        amount: 500000,
        downPayment: 100000,
        rate: 10.5,
        years: 30
    });

    const [result, setResult] = useState({
        monthlyPayment: 0,
        totalInterest: 0,
        totalPayment: 0
    });

    const calculate = () => {
        const principal = values.amount - values.downPayment;
        const monthlyRate = values.rate / 100 / 12;
        const numberOfPayments = values.years * 12;

        // Price Table (Amortization)
        const x = Math.pow(1 + monthlyRate, numberOfPayments);
        const monthly = (principal * x * monthlyRate) / (x - 1);

        setResult({
            monthlyPayment: monthly,
            totalPayment: monthly * numberOfPayments,
            totalInterest: (monthly * numberOfPayments) - principal
        });
    };

    useEffect(() => {
        calculate();
    }, [values]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setValues(prev => ({ ...prev, [name]: Number(value) }));
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Calculadora de Financiamento</h1>
                <p className="text-gray-600">Simule parcelas e juros (Tabela Price)</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Imóvel</label>
                        <div className="relative">
                            <DollarSign size={16} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="number"
                                name="amount"
                                value={values.amount}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Entrada</label>
                        <div className="relative">
                            <DollarSign size={16} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="number"
                                name="downPayment"
                                value={values.downPayment}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Taxa de Juros Anual (%)</label>
                        <div className="relative">
                            <Percent size={16} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="number"
                                name="rate"
                                value={values.rate}
                                onChange={handleChange}
                                step="0.1"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prazo (Anos)</label>
                        <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="number"
                                name="years"
                                value={values.years}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Results */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-xl shadow-lg text-white flex flex-col justify-center">
                    <div className="mb-8 text-center">
                        <p className="text-blue-100 text-sm uppercase tracking-wider font-semibold mb-2">Parcela Mensal Estimada</p>
                        <h2 className="text-5xl font-bold">
                            {result.monthlyPayment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </h2>
                    </div>

                    <div className="space-y-4 border-t border-blue-500/30 pt-6">
                        <div className="flex justify-between items-center">
                            <span className="text-blue-100">Valor Financiado</span>
                            <span className="font-semibold text-lg">
                                {(values.amount - values.downPayment).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-blue-100">Total de Juros</span>
                            <span className="font-semibold text-lg">
                                {result.totalInterest.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-blue-100">Total a Pagar</span>
                            <span className="font-semibold text-lg">
                                {result.totalPayment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                    </div>

                    <div className="mt-8 bg-white/10 p-4 rounded-lg text-sm text-blue-50">
                        <p>* Simulação referencial (Tabela Price). Não inclui taxas administrativas, seguros ou IOF. Consulte seu banco para valores exatos.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
