import { Bindings } from '../types';

interface Commission {
    id: string;
    property_title: string;
    amount: number;
    status: string;
    date: string;
}

export async function calculateCommission(
    env: Bindings,
    tenantId: string,
    contractId: string,
    agentId: string
) {
    // 1. Get Contract & Property Price
    const contract = await env.DB.prepare(`
        SELECT c.id, c.property_id, p.price, p.title 
        FROM contracts c
        JOIN properties p ON c.property_id = p.id
        WHERE c.id = ? AND c.tenant_id = ?
    `)
    .bind(contractId, tenantId)
    .first<any>();

    if (!contract || !contract.price) {
        throw new Error('Contrato ou Preço não encontrado.');
    }

    // 2. Apply Rules (Hardcoded MVP: 6% Fee -> 40% Split)
    const propertyPrice = contract.price;
    const realEstateFee = propertyPrice * 0.06; // 6%
    const agentCommission = realEstateFee * 0.40; // 40%

    // 3. Save Commission
    const commissionId = crypto.randomUUID();
    await env.DB.prepare(`
        INSERT INTO commissions (id, tenant_id, contract_id, agent_id, amount, status)
        VALUES (?, ?, ?, ?, ?, 'Pending')
    `)
    .bind(commissionId, tenantId, contractId, agentId, agentCommission)
    .run();

    return {
        id: commissionId,
        base_price: propertyPrice,
        fee_total: realEstateFee,
        agent_amount: agentCommission
    };
}

export async function getAgentDashboard(env: Bindings, tenantId: string, agentId: string) {
    // 1. Get List
    const results = await env.DB.prepare(`
        SELECT c.id, p.title as property_title, com.amount, com.status, com.created_at
        FROM commissions com
        JOIN contracts c ON com.contract_id = c.id
        JOIN properties p ON c.property_id = p.id
        WHERE com.agent_id = ? AND com.tenant_id = ?
        ORDER BY com.created_at DESC
    `)
    .bind(agentId, tenantId)
    .all<any>();

    // 2. Calculate Totals
    const pending = results.results
        .filter(r => r.status === 'Pending')
        .reduce((sum, r) => sum + r.amount, 0);

    const paid = results.results
        .filter(r => r.status === 'Paid')
        .reduce((sum, r) => sum + r.amount, 0);

    return {
        summary: {
            pending: pending,
            paid: paid,
            total: pending + paid
        },
        history: results.results.map(r => ({
            id: r.id,
            property: r.property_title,
            amount: r.amount,
            status: r.status,
            date: r.created_at
        }))
    };
}
