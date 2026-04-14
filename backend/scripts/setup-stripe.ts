import Stripe from 'stripe';

// LIVE KEY from User Input (Securely processed)
// Em produ√ß√£o, isso viria de process.env.STRIPE_SECRET_KEY
// Para este script ONE-OFF, vou usar a chave fornecida na mem√≥ria (n√£o hardcoded permanentemente no repo)
// Mas como preciso rodar agora, vou pedir para o usu√°rio definir via ENV VAR na execu√ß√£o
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('‚ ERRO: STRIPE_SECRET_KEY n√£o definida.');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  // apiVersion defaults to latest in newer SDKs
  typescript: true,
});

const PRODUCTS = [
  {
    name: 'Oinbox Aut√¥nomo',
    description: 'Para corretores independentes (1 usu√°rio)',
    prices: [
      {
        unit_amount: 20000,
        currency: 'brl',
        recurring: { interval: 'month' },
        lookup_key: 'autonomo_monthly',
      },
      {
        unit_amount: 192000,
        currency: 'brl',
        recurring: { interval: 'year' },
        lookup_key: 'autonomo_yearly',
      },
    ],
  },
  {
    name: 'Oinbox Business',
    description: 'Para imobili√°rias em crescimento (At√© 5 corretores)',
    prices: [
      {
        unit_amount: 50000,
        currency: 'brl',
        recurring: { interval: 'month' },
        lookup_key: 'business_monthly',
      },
      {
        unit_amount: 480000,
        currency: 'brl',
        recurring: { interval: 'year' },
        lookup_key: 'business_yearly',
      },
    ],
  },
  {
    name: 'Oinbox Enterprise',
    description: 'Para redes e franquias (Usu√°rios ilimitados + Leads)',
    prices: [
      {
        unit_amount: 100000,
        currency: 'brl',
        recurring: { interval: 'month' },
        lookup_key: 'enterprise_monthly',
      },
      {
        unit_amount: 960000,
        currency: 'brl',
        recurring: { interval: 'year' },
        lookup_key: 'enterprise_yearly',
      },
    ],
  },
];

async function main() {
  console.log(' Iniciando Setup do Stripe...');

  for (const p of PRODUCTS) {
    console.log(`\n¶ Verificando/Criando Produto: ${p.name}...`);

    // Check if exists
    const search = await stripe.products.search({ query: `name:'${p.name}'` });
    let product = search.data[0];

    if (!product) {
      product = await stripe.products.create({
        name: p.name,
        description: p.description,
      });
      console.log(`   ‚ Criado Produto: ${product.id}`);
    } else {
      console.log(`   ‚πÔ∏ Produto j√° existe: ${product.id}`);
    }

    // Create Prices
    for (const pr of p.prices) {
      console.log(`   ≤ Processando Pre√ßo: ${pr.lookup_key} (${pr.unit_amount / 100} BRL)...`);

      const priceSearch = await stripe.prices.list({
        product: product.id,
        lookup_keys: [pr.lookup_key as string],
      });

      let price = priceSearch.data[0];

      if (!price) {
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: pr.unit_amount,
          currency: pr.currency,
          recurring: pr.recurring as any,
          lookup_key: pr.lookup_key as string,
        });
        console.log(`      ‚ Criado Pre√ßo: ${price.id}`);
      } else {
        console.log(`      ‚πÔ∏ Pre√ßo j√° existe: ${price.id}`);
      }
    }
  }

  console.log('\n‚ Setup Conclu√≠do!');
}

main().catch(console.error);
