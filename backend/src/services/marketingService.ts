import { Bindings } from '../types';

interface Property {
    id: string;
    title: string;
    price: number;
    location: string;
    listing_type: string;
    bedrooms: number;
    bathrooms: number;
    area: number;
    features: string[];
    description: string;
    image_url: string;
}

interface SocialKit {
    caption: string;
    hashtags: string[];
    story_frames: string[];
    image_url: string;
}

type Tone = 'professional' | 'fun' | 'urgent';

export async function generateSocialKit(
    env: Bindings,
    property: Property,
    tone: Tone = 'professional'
): Promise<SocialKit> {
    const toneGuides: Record<Tone, string> = {
        professional: 'Tom formal e elegante. Use linguagem de corretor experiente. Destaque exclusividade.',
        fun: 'Tom leve e descontraído. Use emojis com moderação. Crie conexão emocional.',
        urgent: 'Tom de urgência. Use gatilhos de escassez ("Últimas unidades!", "Oportunidade única!"). FOMO.'
    };

    const prompt = `
Você é um copywriter especialista em Marketing Imobiliário para Instagram Brasil.

IMÓVEL:
- Título: ${property.title}
- Tipo: ${property.listing_type}
- Preço: R$ ${property.price?.toLocaleString('pt-BR') || 'Sob consulta'}
- Localização: ${property.location}
- ${property.bedrooms} quartos, ${property.bathrooms} banheiros, ${property.area}m²
- Características: ${JSON.stringify(property.features)}
- Descrição: ${property.description || 'N/A'}

TOM DESEJADO: ${toneGuides[tone]}

TAREFA:
Gere um Kit de Marketing Social com:

1. LEGENDA (caption): 
   - Use a estrutura AIDA (Atenção, Interesse, Desejo, Ação).
   - Máximo 2200 caracteres.
   - Quebre em parágrafos curtos (1-2 linhas).
   - Use emojis estratégicos (🏠🔑✨💰📍).
   - Termine com CTA claro ("Chame no Direct!", "Link na bio").

2. HASHTAGS:
   - 20-30 hashtags relevantes.
   - Mix de: localização (#${property.location?.split(',')[0]?.trim().replace(/\s/g, '') || 'Imoveis'}), nicho (#ApartamentoVenda, #ImóvelDeLuxo), gerais (#RealEstateBrasil, #ImobiliáriaBrasil).

3. STORY_FRAMES:
   - 3 textos curtos (máx 100 chars cada) para sequência de Stories.
   - Frame 1: Gancho de curiosidade.
   - Frame 2: Destaque principal.
   - Frame 3: CTA urgente.

FORMATO DE RESPOSTA (JSON estrito):
{
  "caption": "...",
  "hashtags": ["#tag1", "#tag2", ...],
  "story_frames": ["Texto frame 1", "Texto frame 2", "Texto frame 3"]
}

Responda APENAS o JSON, sem markdown ou explicações.
`;

    const apiKey = env.API_KEY;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.8, // More creative
                maxOutputTokens: 2048
            }
        })
    });

    const data: any = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    // Clean and parse JSON
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);

    return {
        caption: result.caption,
        hashtags: result.hashtags,
        story_frames: result.story_frames,
        image_url: property.image_url || ''
    };
}
