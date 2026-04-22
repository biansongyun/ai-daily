async function test() {
  const API_KEY = process.env.API_KEY;
  const API_URL = 'https://token-plan-cn.xiaomimimo.com/v1/chat/completions';

  // Simulate actual prompt from update.js
  const articles = [
    { title: 'OpenAI releases GPT-5', url: 'https://openai.com/blog' },
    { title: 'Google DeepMind AlphaFold 3', url: 'https://deepmind.google' },
    { title: 'Anthropic Claude 4 safety', url: 'https://anthropic.com' },
    { title: 'Meta Llama 4 open source', url: 'https://huggingface.co' },
    { title: 'Microsoft Copilot GPT-5', url: 'https://techcrunch.com' }
  ];

  const text = articles.map((a, i) => `${i + 1}. ${a.title}\n   ${a.url}`).join('\n');
  const prompt = `From these Hacker News articles, pick 3 most relevant AI news. Return ONLY JSON:

{"news":[{"category":"llm|research|safety|open|industry|multi","source":"name","srcUrl":"domain","link":"url","title":{"zh":"...","en":"..."},"desc":{"zh":"...","en":"..."},"hoursAgo":1-24}],"trending":[]}

${text}`;

  console.log('Prompt length:', prompt.length);

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
      max_tokens: 2000,
      stream: false
    })
  });

  const rawText = await res.text();
  console.log('Status:', res.status);

  try {
    const data = JSON.parse(rawText);
    console.log('content:', JSON.stringify(data.choices[0].message.content));
    console.log('reasoning_content:', JSON.stringify(data.choices[0].message.reasoning_content).substring(0, 200));
    console.log('finish_reason:', data.choices[0].finish_reason);
  } catch (e) {
    console.log('Raw:', rawText.substring(0, 500));
  }
}

test().catch(console.error);
