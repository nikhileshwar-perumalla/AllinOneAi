import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { runOpenAI, runGemini } from './providers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 5173;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Serve static frontend
app.use(express.static(path.join(__dirname, '..')));

// Simple health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Helper to check enabled models
function getEnabledModels(body){
  const toggles = body?.toggles || {}; // e.g., { gpt4o:true, gemini:false }
  return Object.entries(toggles).filter(([_, v])=>!!v).map(([k])=>k);
}

// Placeholder LLM route (wire to real providers later)
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, toggles, keys } = req.body || {};
    if(!prompt || typeof prompt !== 'string'){
      return res.status(400).json({ error: 'prompt required' });
    }
    const enabled = getEnabledModels({ toggles });
    if(enabled.length === 0){
      return res.status(400).json({ error: 'no models enabled' });
    }
    // Run enabled models that also have API keys
    const responses = {};
    await Promise.all(enabled.map(async (model) => {
      try{
        switch(model){
          case 'gpt4o': {
            const key = keys?.openai || process.env.OPENAI_API_KEY;
            if(!key) return; // skip if no key
            const text = await runOpenAI(prompt, key);
            responses[model] = text || '';
            break;
          }
          case 'gemini': {
            const key = keys?.gemini || process.env.GEMINI_API_KEY;
            if(!key) return;
            const text = await runGemini(prompt, key);
            responses[model] = text || '';
            break;
          }
          // TODO: add claude/grok/commandr/mistral/openrouter providers here
          default:
            break;
        }
      }catch(err){
        responses[model] = `Error: ${err.message || 'failed'}`;
      }
    }));
    res.json({ responses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
