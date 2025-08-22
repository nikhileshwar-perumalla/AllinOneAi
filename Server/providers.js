// Provider helpers using native fetch; no external SDKs required.

export async function runOpenAI(prompt, apiKey){
  if(!apiKey) throw new Error('openai_key_missing');
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    })
  });
  if(!resp.ok){
    const err = await safeJson(resp);
    throw new Error(err?.error?.message || `openai_http_${resp.status}`);
  }
  const json = await resp.json();
  return json?.choices?.[0]?.message?.content || '';
}

export async function runGemini(prompt, apiKey){
  if(!apiKey) throw new Error('gemini_key_missing');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [ { parts: [ { text: prompt } ] } ]
    })
  });
  if(!resp.ok){
    const err = await safeJson(resp);
    throw new Error(err?.error?.message || `gemini_http_${resp.status}`);
  }
  const json = await resp.json();
  // Extract text from candidates
  const parts = json?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts) ? parts.map(p=>p.text).filter(Boolean).join('\n') : '';
  return text;
}

async function safeJson(resp){
  try{ return await resp.json(); }catch{ return null; }
}
