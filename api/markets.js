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
    const arr = Array.isArray(data) ? data : data.markets ?? [];

    const markets = arr
      .filter(m => {
        if (!m.outcomePrices || m.outcomePrices.length !== 2) return false;
        if (!m.question && !m.title) return false;
        // Skip markets where question looks like a matchup (contains " vs " or " vs. ")
        const q = (m.question || m.title || '').toLowerCase();
        if (q.includes(' vs ') || q.includes(' vs. ')) return false;
        return true;
      })
      .map(m => {
        return {
          id: m.id,
          question: m.question || m.title,
          outcomePrices: [m.outcomePrices[0], m.outcomePrices[1]],
          volume24hr: parseFloat(m.volume24hr || 0),
          volume: parseFloat(m.volume || 0),
          liquidityNum: parseFloat(m.liquidityNum || m.liquidity || 0),
          slug: m.slug || null,
          url: m.slug ? `https://polymarket.com/event/${m.slug}` : null,
          endDate: m.endDate || null,
          category: m.category || null,
        };
      })
      .slice(0, 50);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json({ markets, source: 'live', count: markets.length });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
