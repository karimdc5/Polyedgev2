export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const response = await fetch(
      'https://gamma-api.polymarket.com/markets?limit=100&active=true&closed=false&order=volume24hr&ascending=false',
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      return res.status(502).json({ error: 'Polymarket API error', status: response.status });
    }

    const data = await response.json();
    const arr = Array.isArray(data) ? data : [];

    const markets = arr
      .filter(m => {
        if (!m.question && !m.title) return false;
        const q = (m.question || m.title || '').toLowerCase();
        if (q.includes(' vs ') || q.includes(' vs. ')) return false;
        return true;
      })
      .map(m => {
        let prices = ["0.5", "0.5"];
        try {
          if (m.outcomePrices) {
            prices = typeof m.outcomePrices === 'string'
              ? JSON.parse(m.outcomePrices)
              : m.outcomePrices;
          }
        } catch(e) {}

        const question = m.question || m.title || '';
        const directUrl = m.slug ? `https://polymarket.com/event/${m.slug}` : null;
        const searchUrl = `https://polymarket.com/search?q=${encodeURIComponent(question)}`;

        return {
          id: m.id,
          question: question,
          outcomePrices: [String(prices[0] || 0.5), String(prices[1] || 0.5)],
          volume24hr: parseFloat(m.volume24hr || 0),
          volume: parseFloat(m.volume || 0),
          liquidityNum: parseFloat(m.liquidity || 0),
          slug: m.slug || null,
          url: directUrl || searchUrl,
          endDate: m.endDate || null,
        };
      })
      .slice(0, 50);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json({ markets, source: 'live', count: markets.length });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
