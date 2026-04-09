// Comprehensive Plan Limits Configuration v2

export interface PlanConfig {
  name: string;
  displayName: string;
  price: number; // BRL per month
  seats: number;
  properties: number;
  photosPerProperty: number;
  portals: number;
  leadsPerMonth: number;
  aiMessagesPerMonth: number;
  support: 'email' | 'priority' | 'dedicated';
  trialDays?: number; // If set, this is a trial plan
  basePlan?: string; // For trials, the paid plan it upgrades to
}

export const PLANS: Record<string, PlanConfig> = {
  // Trial Plans (14 days)
  TrialCorretor: {
    name: 'TrialCorretor',
    displayName: 'Trial Corretor (14 dias)',
    price: 0,
    seats: 1,
    properties: 999999,
    photosPerProperty: 20,
    portals: 999999,
    leadsPerMonth: 999999,
    aiMessagesPerMonth: 1000,
    support: 'email',
    trialDays: 14,
    basePlan: 'Corretor',
  },
  TrialImobiliaria: {
    name: 'TrialImobiliaria',
    displayName: 'Trial Imobiliária (14 dias)',
    price: 0,
    seats: 5,
    properties: 999999,
    photosPerProperty: 20,
    portals: 999999,
    leadsPerMonth: 999999,
    aiMessagesPerMonth: 2000,
    support: 'email',
    trialDays: 14,
    basePlan: 'Imobiliaria',
  },

  // Paid Plans
  Corretor: {
    name: 'Corretor',
    displayName: 'Corretor',
    price: 200,
    seats: 1,
    properties: 999999,
    photosPerProperty: 20,
    portals: 999999,
    leadsPerMonth: 999999,
    aiMessagesPerMonth: 1000,
    support: 'email',
  },
  Imobiliaria: {
    name: 'Imobiliaria',
    displayName: 'Imobiliária',
    price: 450,
    seats: 5,
    properties: 999999,
    photosPerProperty: 20,
    portals: 999999,
    leadsPerMonth: 999999,
    aiMessagesPerMonth: 2000,
    support: 'priority',
  },
  Rede: {
    name: 'Rede',
    displayName: 'Rede',
    price: 1000,
    seats: 20,
    properties: 999999,
    photosPerProperty: 20,
    portals: 999999,
    leadsPerMonth: 999999,
    aiMessagesPerMonth: 10000,
    support: 'dedicated',
  },
};

// Add-on prices
export const ADDONS = {
  extra_seat: { name: 'Usuário Extra', price: 50 },
  extra_ai: { name: '+500 Msgs IA', price: 30, quantity: 500 },
};

// Helper functions
export function getPlan(planName: string): PlanConfig {
  return PLANS[planName] || PLANS.TrialCorretor;
}

export function getPlanLimit(plan: string, limit: keyof PlanConfig): number {
  const config = PLANS[plan] || PLANS.TrialCorretor;
  const value = config[limit];
  return typeof value === 'number' ? value : 0;
}

export function isTrialExpired(joinedAt: string, plan: string): boolean {
  const config = PLANS[plan];
  if (!config?.trialDays) return false;

  const joined = new Date(joinedAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > config.trialDays;
}

// Backwards compatibility
export const PLAN_LIMITS: Record<string, number> = Object.fromEntries(
  Object.entries(PLANS).map(([k, v]) => [k, v.seats]),
);
