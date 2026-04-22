async function test() {
  const API_KEY = process.env.API_KEY;
  const API_URL = 'https://token-plan-cn.xiaomimimo.com/v1/chat/completions';

  const prompt = `Return ONLY this JSON: {"test":"hello","num":123}`;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'User-Agent': 'Mozilla/5.0'
    },
    body: JSON.stringify({
      model: 'mimo-v2-pro',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 100,
      stream: false
    })
  });

  const rawText = await res.text();
  console.log('Status:', res.status);
  console.log('Raw response:', rawText);

  try {
    const data = JSON.parse(rawText);
    console.log('Parsed content:', data.choices[0].message.content);
  } catch (e) {
    console.log('Parse error:', e.message);
  }
}

test().catch(console.error);
