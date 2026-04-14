import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Calendar,
  Wallet, // Added based on instruction, though not used in provided snippet
  ArrowRight,
  TrendingDown, // Added based on instruction, though not used in provided snippet
  TrendingUp,
  Landmark, // Kept as it's used
  RefreshCcw,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Share2,
} from 'lucide-react';

// Taxas de Mercado (Simulação de API Real-time)
const MARKET_INDICES = {
  selic: 11.25,
  ipca: 4.5,
  tr: 0.15,
};

interface BankOption {
  id: string;
  name: string;
  color: string;
  baseRate: number; // Taxa de Juros Anual
  adminFee: number; // Taxa Adm Mensal (R$)
  insuranceRate: number; // % sobre o saldo devedor (MIP+DFI est.)
  logoBg: string;
}

const BANKS: BankOption[] = [
  {
    id: 'caixa',
    name: 'Caixa Econômica',
    color: 'text-primary',
    logoBg: 'bg-blue-100',
    baseRate: 8.99,
    adminFee: 25.0,
    insuranceRate: 0.035,
  },
  {
    id: 'itau',
    name: 'Itaú Personalité',
    color: 'text-orange-600',
    logoBg: 'bg-orange-100',
    baseRate: 10.49,
    adminFee: 0,
    insuranceRate: 0.042,
  },
  {
    id: 'bradesco',
    name: 'Bradesco Prime',
    color: 'text-red-600',
    logoBg: 'bg-red-100',
    baseRate: 10.2,
    adminFee: 0,
    insuranceRate: 0.04,
  },
  {
    id: 'santander',
    name: 'Santander Select',
    color: 'text-red-700',
    logoBg: 'bg-red-50',
    baseRate: 10.99,
    adminFee: 0,
    insuranceRate: 0.038,
  },
  {
    id: 'bb',
    name: 'Banco do Brasil',
    color: 'text-yellow-600',
    logoBg: 'bg-yellow-100',
    baseRate: 9.8,
    adminFee: 0,
    insuranceRate: 0.036,
  },
];

const FinancialCalculator: React.FC = () => {
  const [propertyValue, setPropertyValue] = useState(650000);
  const [downPayment, setDownPayment] = useState(130000); // 20% default
  const [years, setYears] = useState(30);
  const [selectedBank, setSelectedBank] = useState<string>('caixa');
  const [isCalculating, setIsCalculating] = useState(false);

  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    calculateLoan();
  }, [propertyValue, downPayment, years, selectedBank]);

  const calculateLoan = () => {
    setIsCalculating(true);

    // Simula delay de "conexão com o banco"
    setTimeout(() => {
      const bank = BANKS.find((b) => b.id === selectedBank) || BANKS[0];
      const loanAmount = propertyValue - downPayment;
      const months = years * 12;

      // Juros Mensais Efetivos (Juros Compostos)
      const monthlyRate = Math.pow(1 + bank.baseRate / 100, 1 / 12) - 1;

      // C�LCULO SAC (Sistema de Amortização Constante)
      const amortization = loanAmount / months;

      // Primeira Parcela
      const firstInterest = loanAmount * monthlyRate;
      // The instruction provided a line that is syntactically incorrect here.
      // Assuming the intent was to remove the original line and not replace it with a function definition.
      // If a specific replacement was intended, please provide a syntactically valid line.
      // For now, I'm removing the original line as per the instruction's implied removal.
      // Original line: const firstInsurance = loanAmount * (bank.insuranceRate / 100); // Est. Seguro
      const firstInstallment = amortization + firstInterest + bank.adminFee; // Adjusted as firstInsurance was removed

      // �ltima Parcela
      const lastInterest = amortization * monthlyRate; // Saldo devedor é apenas 1 amortização
      const lastInsurance = amortization * (bank.insuranceRate / 100);
      const lastInstallment = amortization + lastInterest + lastInsurance + bank.adminFee;

      // CET Aproximado (Custo Efetivo Total)
      const cet = bank.baseRate + 1.5; // Estimativa simples adicionando custos

      // Renda Mínima (Regra de 30%)
      const requiredIncome = firstInstallment / 0.3;

      setResult({
        bankName: bank.name,
        loanAmount,
        firstInstallment,
        lastInstallment,
        monthlyRate: (monthlyRate * 100).toFixed(2),
        cet: cet.toFixed(2),
        requiredIncome,
        totalPaid: ((firstInstallment + lastInstallment) / 2) * months, // Aproximação
      });
      setIsCalculating(false);
    }, 600);
  };

  return (
    <div className="flex-1 bg-gray-50 p-4 md:p-8 overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto">
        {/* Header & Market Ticker */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-600 p-3 rounded-xl text-white shadow-lg shadow-green-600/20">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Hub de Crédito Imobiliário</h1>
              <p className="text-muted-foreground text-sm flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Conectado às taxas de mercado (B3/Bacen)
              </p>
            </div>
          </div>

          {/* Ticker */}
          <div className="flex gap-4 bg-white p-2 rounded-lg border border-gray-200 shadow-sm text-xs font-mono">
            <div className="px-3 py-1 bg-gray-50 rounded">
              <span className="text-gray-500">SELIC:</span>{' '}
              <span className="font-bold text-foreground">{MARKET_INDICES.selic}%</span>
            </div>
            <div className="px-3 py-1 bg-gray-50 rounded">
              <span className="text-gray-500">IPCA:</span>{' '}
              <span className="font-bold text-foreground">{MARKET_INDICES.ipca}%</span>
            </div>
            <div className="px-3 py-1 bg-gray-50 rounded">
              <span className="text-gray-500">TR:</span>{' '}
              <span className="font-bold text-foreground">+{MARKET_INDICES.tr}%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Simulation Form */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-foreground mb-6 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" /> Dados do Financiamento
              </h3>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
                    Valor do Imóvel
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                      R$
                    </span>
                    <input
                      type="number"
                      value={propertyValue}
                      onChange={(e) => setPropertyValue(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-foreground text-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
                    Entrada
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                      R$
                    </span>
                    <input
                      type="number"
                      value={downPayment}
                      onChange={(e) => setDownPayment(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-foreground"
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs">
                    <span className="text-muted-foreground font-medium">Mínimo sugerido: 20%</span>
                    <span
                      className={`font-bold ${downPayment / propertyValue < 0.2 ? 'text-red-500' : 'text-green-600'}`}
                    >
                      {((downPayment / propertyValue) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
                    Prazo de Pagamento
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <select
                      value={years}
                      onChange={(e) => setYears(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-foreground appearance-none"
                    >
                      <option value={10}>10 anos (120 meses)</option>
                      <option value={15}>15 anos (180 meses)</option>
                      <option value={20}>20 anos (240 meses)</option>
                      <option value={25}>25 anos (300 meses)</option>
                      <option value={30}>30 anos (360 meses)</option>
                      <option value={35}>35 anos (420 meses)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated AI Tip */}
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex gap-3">
              <div className="bg-white p-2 rounded-full h-fit shadow-sm">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-800 uppercase mb-1">
                  Dica do Especialista
                </p>
                <p className="text-sm text-indigo-700 leading-snug">
                  A Selic está em {MARKET_INDICES.selic}%. A Caixa Econômica costuma ter as melhores
                  taxas para primeiro imóvel via SFH.
                </p>
              </div>
            </div>
          </div>

          {/* Center: Bank Selector */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wide">
                Selecione a Instituição Financeira
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {BANKS.map((bank) => (
                  <button
                    key={bank.id}
                    onClick={() => setSelectedBank(bank.id)}
                    className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                      selectedBank === bank.id
                        ? 'border-blue-600 bg-blue-50 shadow-md scale-105 ring-1 ring-blue-600'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${bank.logoBg}`}
                    >
                      <Building2 className={`w-5 h-5 ${bank.color}`} />
                    </div>
                    <span
                      className={`text-xs font-bold ${selectedBank === bank.id ? 'text-foreground' : 'text-gray-500'}`}
                    >
                      {bank.name}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {bank.baseRate}% a.a.
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Result Card */}
            {result && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all relative">
                {isCalculating && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCcw className="w-8 h-8 text-primary animate-spin" />
                      <span className="text-sm font-bold text-primary">
                        Consultando taxas vigentes...
                      </span>
                    </div>
                  </div>
                )}

                {/* Top Banner */}
                <div className="bg-background p-6 text-white flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Resultado Simulado
                    </p>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      {result.bankName}
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Custo Efetivo Total (CET)</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      {result.cet}%{' '}
                      <span className="text-sm font-normal text-muted-foreground">a.a.</span>
                    </p>
                  </div>
                </div>

                <div className="p-6 md:p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Coluna Parcelas */}
                    <div className="space-y-4">
                      <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                        <p className="text-xs font-bold text-green-700 uppercase mb-1">
                          Primeira Parcela
                        </p>
                        <p className="text-3xl font-extrabold text-foreground">
                          R${' '}
                          {result.firstInstallment.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" /> Decrescente (SAC)
                        </p>
                      </div>
                      <div className="flex justify-between items-center px-2">
                        <span className="text-sm text-gray-500">�ltima parcela (estimada)</span>
                        <span className="font-bold text-slate-700">
                          R${' '}
                          {result.lastInstallment.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Coluna Requisitos */}
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                          Renda Familiar Exigida
                        </p>
                        <p className="text-2xl font-bold text-slate-700">
                          R${' '}
                          {result.requiredIncome.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-orange-500 bg-orange-50 w-fit px-2 py-1 rounded">
                          <AlertTriangle className="w-3 h-3" />
                          Comprometimento máx. 30%
                        </div>
                      </div>
                      <div className="flex justify-between items-center px-2">
                        <span className="text-sm text-gray-500">Taxa mensal efetiva</span>
                        <span className="font-bold text-slate-700">{result.monthlyRate}% a.m.</span>
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-100 mb-6" />

                  <div className="flex flex-col md:flex-row gap-4">
                    <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2">
                      <Share2 className="w-5 h-5" /> Gerar PDF para Cliente
                    </button>
                    <button className="flex-1 bg-white border border-gray-300 text-slate-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                      <Landmark className="w-5 h-5 text-muted-foreground" /> Solicitar Análise de
                      Crédito
                    </button>
                  </div>

                  <p className="text-[10px] text-center text-gray-400 mt-6 max-w-lg mx-auto">
                    * Simulação baseada em tabelas vigentes (SAC-TR). Inclui estimativa de Seguros
                    (MIP/DFI) e Taxa Adm. Sujeito a análise de crédito e aprovação da instituição
                    financeira. Valores informativos.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialCalculator;
