export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    const response = await fetch(
      'https://gamma-api.polymarket.com/markets?limit=50&active=true&closed=false&order=volume24hr&ascending=false',
      { headers: { 'Accept': 'application/json' } }
    );
    
    if (!response.ok) {
      return res.status(502).json({ error: 'Polymarket API error', status: response.status });
    }
    
    const data = await response.json();
    const arr = Array.isArray(data) ? data : data.markets ?? [];
    
    // Clean and add direct URLs
    const markets = arr
      .filter(m => m.outcomePrices?.length >= 2 && (m.question || m.title))
      .map(m => ({
        id: m.id,
        question: m.question || m.title,
        outcomePrices: m.outcomePrices,
        volume24hr: parseFloat(m.volume24hr || 0),
        volume: parseFloat(m.volume || 0),
        liquidityNum: parseFloat(m.liquidityNum || m.liquidity || 0),
        slug: m.slug || null,
        url: m.slug ? `https://polymarket.com/event/${m.slug}` : null,
        endDate: m.endDate || null,
        category: m.category || null,
      }));
    
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json({ markets, source: 'live', count: markets.length });
    
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
