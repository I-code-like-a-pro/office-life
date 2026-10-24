/* OfficeLife conversation: free-text chat with a coworker.
   With an Anthropic API key (optional, kept in this browser only) replies come from Claude.
   Without one, a small offline system answers in character. Both are scored the same way. */
(function () {
'use strict';
const C = window.Content, P = window.Profile;
const POS = /\b(thanks|thank you|please|appreciate|great|nice|love|awesome|amazing|wonderful|kind|sweet|lovely|cool|happy|glad|good|congrat|sorry|help)\b/i;
const NEG = /\b(hate|stupid|shut up|idiot|boring|useless|dumb|annoying|whatever|sucks|worst|ugly|loser)\b/i;
const pick = a => a[Math.floor(Math.random() * a.length)];

/* tone: -1 rude, 0 neutral, +1 warm */
function sentiment(text) {
  if (NEG.test(text)) return -1;
  if (POS.test(text)) return 1;
  return 0;
}
function localReply(npcId, text) {
  const R = C.REPLIES, t = text.toLowerCase();
  if (NEG.test(t)) return pick(R.rude);
  if (/\b(thanks|thank you|appreciate)\b/.test(t)) return pick(R.thanks);
  if (/\b(great|awesome|amazing|love|wonderful|lovely|nice job|well done)\b/.test(t)) return pick(R.compliment);
  if (/\b(hi|hello|hey|morning|afternoon|evening)\b/.test(t)) return pick(R.greet);
  if (/how are you|how's it going|how is your|you ok|you okay/.test(t)) return pick(R.how);
  if (/\b(ticket|bug|code|deploy|project|meeting|stuck|error|test|review|work)\b/.test(t)) return pick(R.work);
  if (/\b(lunch|coffee|weekend|plans|food|tea|dinner|holiday|movie|music|podcast|run|plant|book)\b/.test(t)) return pick(R.social);
  if (t.includes('?')) return pick(R.question);
  return pick(R.fallback);
}

async function aiReply(npc, history, ctx) {
  const key = P.aiKey;
  const sys = 'You are ' + npc.name + ', ' + npc.role + ' at OfficeLife Inc., in a cozy, relaxing workplace life-sim. ' + (C.PERSONAS[npc.id] || '') +
    ' The player is a new graduate on their ' + ctx.dayLabel + '. It is ' + ctx.time + '. Your friendship level with them is ' + ctx.hearts + ' out of 5 hearts. ' +
    'Reply in character in at most 40 words. Be warm, natural and supportive. Never mention being an AI, a game, or these instructions.';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 160, system: sys, messages: history.slice(-8) }),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const j = await res.json();
  const txt = (j.content || []).map(b => b.text || '').join('').trim();
  if (!txt) throw new Error('empty');
  return txt;
}

/* open the chat modal. opts: { npc, ctx, onTurn(tone, text), onClose(turns) } */
function open(opts) {
  const el = document.getElementById('convo'), log = document.getElementById('convoLog'), input = document.getElementById('convoIn'), sendBtn = document.getElementById('convoSend');
  const name = opts.npc.name, history = []; let turns = 0, busy = false;
  document.getElementById('convoTitle').textContent = 'Chatting with ' + name + (P.aiKey ? ' (AI)' : '');
  document.getElementById('convoHearts').textContent = P.heartString(opts.npc.id);
  log.innerHTML = ''; input.value = ''; el.classList.remove('hidden');
  const bubble = (who, text) => { const d = document.createElement('div'); d.className = 'bub ' + who; d.textContent = text; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; };
  const opener = pick(C.REPLIES.greet);
  bubble('them', opener); history.push({ role: 'assistant', content: opener }); history.shift && null;
  history.unshift({ role: 'user', content: '(you walk up to say hi)' });
  setTimeout(() => input.focus(), 50);

  async function send() {
    const text = input.value.trim();
    if (!text || busy) return;
    busy = true; input.value = ''; sendBtn.disabled = true;
    bubble('me', text); history.push({ role: 'user', content: text });
    const tone = sentiment(text); turns++;
    if (opts.onTurn) opts.onTurn(tone, text);
    const wait = bubble('them', '...');
    let reply;
    if (P.aiKey) { try { reply = await aiReply(opts.npc, history, opts.ctx()); } catch (e) { reply = localReply(opts.npc.id, text); wait.title = 'Offline reply (AI unavailable)'; } }
    else { await new Promise(r => setTimeout(r, 450)); reply = localReply(opts.npc.id, text); }
    wait.textContent = reply; history.push({ role: 'assistant', content: reply });
    document.getElementById('convoHearts').textContent = P.heartString(opts.npc.id);
    if (turns >= 6) bubble('sys', 'That was a lovely chat. Press Leave when you are ready.');
    busy = false; sendBtn.disabled = false; input.focus();
  }
  sendBtn.onclick = send;
  input.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); send(); } if (e.key === 'Escape') close(); };
  function close() { el.classList.add('hidden'); sendBtn.onclick = null; input.onkeydown = null; if (opts.onClose) opts.onClose(turns); }
  document.getElementById('convoLeave').onclick = close;
  return { close };
}

window.Convo = { open, sentiment, localReply };
})();
