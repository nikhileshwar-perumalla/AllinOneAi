// Simple front-end controller for FeastedChat
// - Handles form submit placeholder
// - Controls model toggles -> show/hide response cards based on localStorage toggles from settings page

(function(){
  const form = document.getElementById('chatForm');
  const input = document.getElementById('promptInput');

  // Map model ids to response card containers
  const MODEL_MAP = {
    gpt4o: document.getElementById('card-gpt4o'),
    gemini: document.getElementById('card-gemini'),
    claude: document.getElementById('card-claude'),
    grok: document.getElementById('card-grok'),
    commandr: document.getElementById('card-commandr'),
    mistral: document.getElementById('card-mistral'),
    openrouter: document.getElementById('card-openrouter'),
  };

  // Map model -> checkbox element
  const TOGGLE_INPUTS = Object.fromEntries(
    Object.keys(MODEL_MAP).map(k => [k, document.getElementById(`toggle-${k}`)])
  );

  function getToggles(){
    // Prefer live checkbox states; fall back to localStorage
    return Object.fromEntries(Object.keys(MODEL_MAP).map(k => {
      const el = TOGGLE_INPUTS[k];
      return [k, el ? !!el.checked : (localStorage.getItem(`toggle-${k}`) === 'true')];
    }));
  }

  function getKeys(){
    // Map per model -> key name in LS
    return {
      openai: localStorage.getItem('gpt4o_api_key') || localStorage.getItem('openai_api_key') || '',
      gemini: localStorage.getItem('gemini_api_key') || '',
      // add more when providers are added
    };
  }

  function modelHasKey(model){
    const k = getKeys();
    switch(model){
      case 'gpt4o': return !!k.openai;
      case 'gemini': return !!k.gemini;
      // extend for other providers
      default: return false;
    }
  }

  // Apply visibility based on toggles stored by settings page
  function applyModelVisibility(){
    Object.entries(MODEL_MAP).forEach(([key, el])=>{
      if(!el) return;
      // Ensure checkbox reflects LS on first load
      const saved = localStorage.getItem(`toggle-${key}`);
      if(TOGGLE_INPUTS[key] && saved !== null){
        TOGGLE_INPUTS[key].checked = (saved === 'true');
      }
      const enabled = TOGGLE_INPUTS[key] ? !!TOGGLE_INPUTS[key].checked : (saved === 'true');
      el.classList.toggle('hidden', !enabled);
      // Add a badge if disabled keys
      const keyVal = localStorage.getItem(`${key}_api_key`);
      const badge = el.querySelector('.no-key-badge');
      if(badge){ badge.textContent = keyVal ? '' : 'No Key'; badge.classList.toggle('hidden', !!keyVal); }
    });

    // Update the models list "No Key" badges next to checkboxes
    Object.entries(TOGGLE_INPUTS).forEach(([key, input]) => {
      if(!input) return;
      const label = input.closest('label');
      const badge = label ? label.querySelector('.no-key') : null;
      const hasKey = !!localStorage.getItem(`${key}_api_key`);
      if(badge){ badge.classList.toggle('hidden', hasKey); }
    });
  }

  applyModelVisibility();

  // Persist toggle changes and update visibility immediately
  Object.entries(TOGGLE_INPUTS).forEach(([key, input]) => {
    if(!input) return;
    input.addEventListener('change', () => {
      localStorage.setItem(`toggle-${key}`, String(!!input.checked));
      applyModelVisibility();
    });
  });

  // Sync when settings are updated in another tab
  window.addEventListener('storage', (e) => {
    if(!e.key) return;
    if(e.key.startsWith('toggle-') || e.key.endsWith('_api_key')){
      applyModelVisibility();
    }
  });

  async function generate(prompt){
    const toggles = getToggles();
    const keys = getKeys();
    // Short-circuit if nothing enabled
    if(!Object.values(toggles).some(Boolean)){
      throw new Error('no models enabled');
    }
    const res = await fetch('/api/generate',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ prompt, toggles, keys })
    });
    if(!res.ok){
      const err = await res.json().catch(()=>({error:'request_failed'}));
      throw new Error(err.error || 'request_failed');
    }
    return res.json();
  }

  function clearVisibleCards(){
    Object.entries(MODEL_MAP).forEach(([key, el])=>{
      if(!el || el.classList.contains('hidden')) return;
      const content = el.querySelector('.response-content');
      if(!content) return;
      if(modelHasKey(key)){
        content.textContent = 'Thinking...';
      } else {
        content.textContent = 'Missing API key';
      }
    });
  }

  if(form){
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const prompt = (input?.value || '').trim();
      if(!prompt) return;
      clearVisibleCards();
      try{
        const { responses } = await generate(prompt);
        Object.entries(responses || {}).forEach(([model, text])=>{
          const card = MODEL_MAP[model];
          if(!card) return;
          const content = card.querySelector('.response-content');
          if(content) content.textContent = text;
        });
      }catch(err){
        console.error(err);
        // Show minimal error
        const card = document.getElementById('card-gpt4o');
        const content = card?.querySelector('.response-content');
        if(content) content.textContent = 'Error: ' + err.message;
      }
      form.reset();
    });
  }
})();
