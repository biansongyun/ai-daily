const fs = require('fs');
const path = require('path');

const API_KEY = process.env.API_KEY;
const API_URL = 'https://token-plan-cn.xiaomimimo.com/v1/chat/completions';

async function fetchHN() {
  const url = 'https://hn.algolia.com/api/v1/search_by_date?query=artificial+intelligence+OR+machine+learning+OR+LLM&tags=story&hitsPerPage=10';
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error('HN API failed: ' + res.status);
  const data = await res.json();
  return data.hits.map(h => ({
    title: h.title,
    url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
    time: h.created_at_i || Math.floor(Date.now() / 1000) - 3600
  }));
}

async function summarizeWithLLM(articles) {
  const text = articles.map((a, i) => `${i + 1}. ${a.title}\n   ${a.url}`).join('\n');

  const prompt = `From these Hacker News articles, pick 6 most relevant AI news. Return ONLY JSON:

{"news":[{"category":"llm|research|safety|open|industry|multi","source":"name","srcUrl":"domain","link":"url","title":{"zh":"...","en":"..."},"desc":{"zh":"...","en":"..."},"hoursAgo":1-24}],"trending":[{"rank":"01","color":"#A855F7","text":{"zh":"...","en":"..."},"count":"1.2k"},{"rank":"02","color":"#06B6D4","text":{"zh":"...","en":"..."},"count":"874"},{"rank":"03","color":"#EC4899","text":{"zh":"...","en":"..."},"count":"621"},{"rank":"04","color":"#EAB308","text":{"zh":"...","en":"..."},"count":"509"},{"rank":"05","color":"#22C55E","text":{"zh":"...","en":"..."},"count":"388"}]}

Categories: llm=LLM models, research=academic, safety=AI safety, open=open source, industry=business/chips, multi=video/image/audio.
Articles are from last 24h. No markdown, no explanation, pure JSON only.

${text}`;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'User-Agent': 'Mozilla/5.0'
    },
    body: JSON.stringify({
      model: 'mimo-v2-omni',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
      stream: false
    })
  });

  const rawText = await res.text();

  if (!res.ok) {
    throw new Error('LLM API error ' + res.status + ': ' + rawText.substring(0, 200));
  }

  const data = JSON.parse(rawText);
  let content = data.choices[0].message.content;
  console.log('📝 Raw LLM content:', content.substring(0, 500));

  // Extract JSON from markdown code block if present
  const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) content = match[1];

  try {
    return JSON.parse(content.trim());
  } catch (parseErr) {
    console.error('❌ JSON parse failed. Content preview:', content.substring(0, 300));
    throw parseErr;
  }
}

async function main() {
  try {
    console.log('🔍 Fetching Hacker News articles...');
    const articles = await fetchHN();
    console.log(`📰 Found ${articles.length} articles`);

    console.log('🤖 Generating summaries with LLM...');
    const generated = await summarizeWithLLM(articles);

    const data = {
      news: (generated.news || []).map((n, i) => ({ ...n, id: i + 1 })),
      trending: generated.trending || [],
      sources: [
        { name: 'Hacker News',       url: 'news.ycombinator.com', color: '#FF6600' },
        { name: 'OpenAI Blog',       url: 'openai.com',           color: '#A855F7' },
        { name: 'Anthropic Blog',    url: 'anthropic.com',        color: '#EC4899' },
        { name: 'ArXiv',             url: 'arxiv.org',            color: '#B31B1B' },
        { name: 'Hugging Face',      url: 'huggingface.co',       color: '#22C55E' },
        { name: 'Google DeepMind',   url: 'deepmind.google',      color: '#06B6D4' },
        { name: 'TechCrunch',        url: 'techcrunch.com',       color: '#EAB308' },
        { name: 'MIT Tech Review',   url: 'technologyreview.com', color: '#A855F7' }
      ],
      updatedAt: new Date().toISOString()
    };

    const outputPath = path.join(__dirname, '..', 'data.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log('✅ data.json updated at', data.updatedAt);
    console.log(`📊 ${data.news.length} news, ${data.trending.length} trending topics`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
