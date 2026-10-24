/* OfficeLife profile: everything that persists between runs (coins, friendships, decor, reputation). Stored in localStorage. */
(function () {
'use strict';
const KEY = 'officelife.profile.v1', AI_KEY = 'officelife.aikey';
const TITLES = [[0, 'Intern'], [20, 'Junior Engineer'], [50, 'Engineer'], [90, 'Senior Engineer']];
const defaults = () => ({ coins: 0, hearts: {}, owned: [], stories: {}, rep: 0, catName: 'Miso', days: 0, avatar: { skin: 0xf1c9a5, hair: 0x2b1d14, style: 'short' } });
let data = defaults();
try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) data = Object.assign(defaults(), s); } catch (e) {}

const P = {
  get data() { return data; },
  save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} },
  reset() { data = defaults(); P.save(); },
  addCoins(n) { data.coins = Math.max(0, data.coins + n); return data.coins; },
  /* friendship points 0..100 per person; 20 points = 1 heart */
  points(id) { return data.hearts[id] || 0; },
  level(id) { return Math.min(5, Math.floor(P.points(id) / 20)); },
  addHearts(id, pts) {
    const before = P.level(id);
    data.hearts[id] = Math.min(100, P.points(id) + pts);
    return { before, after: P.level(id) };
  },
  heartString(id) { const l = P.level(id); return '♥'.repeat(l) + '♡'.repeat(5 - l); },
  owns(id) { return data.owned.includes(id); },
  buy(item) {
    if (P.owns(item.id) || data.coins < item.price) return false;
    data.coins -= item.price; data.owned.push(item.id); P.save(); return true;
  },
  titleFor(rep) { let t = TITLES[0][1]; TITLES.forEach(([n, name]) => { if (rep >= n) t = name; }); return t; },
  get title() { return P.titleFor(data.rep); },
  /* optional AI key (kept in this browser only, never in the profile blob) */
  get aiKey() { try { return localStorage.getItem(AI_KEY) || ''; } catch (e) { return ''; } },
  set aiKey(v) { try { v ? localStorage.setItem(AI_KEY, v) : localStorage.removeItem(AI_KEY); } catch (e) {} },
};
window.Profile = P;
})();
