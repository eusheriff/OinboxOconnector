import { Context } from 'hono';

export type Bindings = {
    DB: D1Database;
    IMAGES: R2Bucket;
    AI: any; // Cloudflare AI binding
    JWT_SECRET: string;
    API_KEY: string; // Gemini API Key
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    RESEND_API_KEY: string;
    // Evolution API (WhatsApp)
    EVOLUTION_API_URL: string;
    EVOLUTION_API_KEY: string;
};

export type Variables = {
    user: {
        sub: string;
        tenantId: string;
        role: string;
        name: string;
        email: string;
    };
};

export type HonoContext = Context<{ Bindings: Bindings; Variables: Variables }>;
