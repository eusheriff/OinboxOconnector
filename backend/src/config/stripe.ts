
export const STRIPE_PLANS = {
  Autônomo: {
    monthly: 'price_1So3p7BGBVDzrAhzFGNYufo4',
    yearly: 'price_1So3p8BGBVDzrAhzI4wYDNfc',
  },
  Business: {
    monthly: 'price_1So3p9BGBVDzrAhzfpMFVj8M',
    yearly: 'price_1So3pABGBVDzrAhz9Oq98PXL',
  },
  Enterprise: {
    monthly: 'price_1So3pBBGBVDzrAhz3xU6yR9h',
    yearly: 'price_1So3pCBGBVDzrAhzeN3CNc0c',
  },
  // Mapeamento reverso para identificar o plano pelo priceId no webhook
  BY_PRICE_ID: {
    'price_1So3p7BGBVDzrAhzFGNYufo4': 'Autônomo',
    'price_1So3p8BGBVDzrAhzI4wYDNfc': 'Autônomo',
    'price_1So3p9BGBVDzrAhzfpMFVj8M': 'Business',
    'price_1So3pABGBVDzrAhz9Oq98PXL': 'Business',
    'price_1So3pBBGBVDzrAhz3xU6yR9h': 'Enterprise',
    'price_1So3pCBGBVDzrAhzeN3CNc0c': 'Enterprise',
  }
};
