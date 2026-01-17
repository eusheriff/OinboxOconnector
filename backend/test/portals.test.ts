import { describe, it, expect, vi } from 'vitest';
import portals from '../src/routes/portals';

// Mock DB
const mockDB = {
  prepare: vi.fn(),
};

const mockEnv = {
  DB: mockDB,
  DATADOG_API_KEY: 'mock-key',
  API_KEY: 'mock-api-key'
};

describe('Portals Route - XML Feed', () => {
  it('should generate XML feed for valid tenant', async () => {
    // Setup Mock Data
    const mockProperties = [
      {
        id: 'prop-1',
        title: 'Apartamento de Luxo',
        price: 500000,
        listing_type: 'sale',
        location: 'Rua Flores, 123, Centro, São Paulo',
        description: 'Lindo apto',
        bedrooms: 3,
        bathrooms: 2,
        area: 120,
        publish_to_portals: 1,
        image_url: 'http://img.com/1.jpg',
        features: '["Pool", "Gym"]'
      }
    ];

    // Mock DB Response
    mockDB.prepare.mockReturnValue({
      bind: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: mockProperties })
      })
    });

    // Create Request
    const req = new Request('http://localhost/feed/tenant-123.xml');
    
    // Dispatch (req, RequestInit, Env)
    const res = await portals.request(req, undefined, mockEnv as any);

    // Assert Status
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/xml');

    // Assert Content
    const text = await res.text();
    expect(text).toContain('<ListingDataFeed xmlns="http://www.vivareal.com/schemas/1.0"');
    expect(text).toContain('<ListingID>prop-1</ListingID>');
    expect(text).toContain('<Title>Apartamento de Luxo</Title>');
    expect(text).toContain('<City>São Paulo</City>'); // From address parsing
    expect(text).toContain('<ListPrice currency="BRL">500000</ListPrice>');
  });

  it('should handle empty results gracefully', async () => {
    mockDB.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      });
  
      const req = new Request('http://localhost/feed/tenant-empty.xml');
      const res = await portals.request(req, undefined, mockEnv as any);
  
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('<Listings>\n  </Listings>');
  });
});
