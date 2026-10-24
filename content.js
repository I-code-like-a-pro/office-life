/* OfficeLife content: modes, five days of tickets/events, small talk. Pure data. */
(function () {
'use strict';
const m = (h, mm) => h * 60 + (mm || 0);

/* reply helper: s = score deltas per category */
const o = (label, s) => ({ label, s });

const MODES = [
  { id: 'taster', label: '1-day taster', days: 1, blurb: 'One full workday. Good for a first try.' },
  { id: 'sprint', label: '3-day sprint', days: 3, blurb: 'Onboarding, a deploy day and a production incident.' },
  { id: 'week', label: 'Full week', days: 5, blurb: 'The whole five-day experience, with a final retro.' },
];
const SPEEDS = [
  { id: 'standard', label: 'Standard (about 10 min per day)', secPerMin: 1.2 },
  { id: 'quick', label: 'Quick (about 5 min per day)', secPerMin: 0.6 },
];

const DAYS = [
/* ------------------------------------------------------------ DAY 1 */
{
  title: 'Day 1: Welcome aboard',
  blurb: 'Meet Dana, find your desk and ship your first fixes. Take it steady and ask for help when you need it.',
  tickets: [
    { id: 'BUG-101', title: 'Cart total crashes on the last item', type: 'choice', avail: m(9, 10), due: m(11, 30),
      spec: "Customers get \"Cannot read properties of undefined (reading 'price')\" at checkout. Fix the function.",
      code: "function total(items) {\n  let sum = 0;\n  for (let i = 0; i <= items.length; i++) {\n    sum += items[i].price;\n  }\n  return sum;\n}",
      opts: ['Change `<=` to `<` in the loop condition', 'Wrap the loop body in try/catch and ignore the error', 'Start `sum` at 1 instead of 0'],
      ok: 0, why: ['', 'That hides the symptom. The loop still reads past the end of the array.', 'That makes every total wrong by 1.'],
      hint: 'Arrays are 0-indexed, so the last valid index is length - 1. Look at the loop condition.' },
    { id: 'BUG-114', title: 'Every user sees the admin panel', type: 'choice', avail: m(11), due: m(14),
      spec: 'Regular users can see the admin panel. Security is unhappy. Fix it.',
      code: "if (user.role = 'admin') {\n  showAdminPanel();\n}",
      opts: ["Use a comparison: `user.role === 'admin'`", 'Change to `if (user.role)`', 'Add `|| true` so the check always passes'],
      ok: 0, why: ['', 'That shows the panel to any user who has a role at all.', 'That makes the bug worse.'],
      hint: 'Count the equals signs. One of them assigns, it does not compare.' },
    { id: 'FEAT-120', title: 'Speed up getPrices()', type: 'choice', avail: m(14), due: m(16, 30), prob: true,
      spec: 'getPrices() hits a slow API on every page view. Add caching. (Check your messages for client constraints.)',
      code: "async function getPrices() {\n  return await slowApi.fetch('/prices');\n}",
      opts: ['Cache the result forever in a global variable', 'Cache the result with a 60 second expiry', "Remove the API call and hardcode today's prices"],
      ok: 1, why: ['Prices would go stale. The client needs them fresh within a minute.', '', 'Hardcoded prices are wrong by tomorrow.'],
      hint: 'Caching is fine, but think about how long a cached value is allowed to live.' },
  ],
  events: [
    { at: m(9, 2), from: 'Dana (Manager)', text: "Morning! Standup: you have 3 tickets today. Check them on your computer at your desk. Any questions?", deadline: 40,
      opts: [o("Got it. I'll start with the first ticket and flag blockers early.", { comm: 100, prof: 100 }), o('ok', { comm: 40, prof: 50 }), o('Do I really have to do all of these?', { comm: 30, prof: 15 })] },
    { at: m(10, 30), from: 'Sam', text: "Hey, quick one. My local env is broken and I'm blocked. Do you know how to reset it?", deadline: 45,
      opts: [o("I'm mid-ticket. Can we sync at 12 and I'll walk you through it?", { comm: 100, prof: 100 }), o("Sure, I'll drop everything and help now.", { comm: 75, prof: 70 }), o('Not my problem.', { comm: 10, prof: 0 })] },
    { at: m(14, 30), from: 'Dana (Manager)', text: 'Heads-up: the client needs prices to be fresh within 1 minute. That affects FEAT-120.', deadline: 40,
      opts: [o("Thanks, I'll cache with a 60s expiry.", { prob: 100, comm: 90, prof: 95 }), o('Does that apply to all endpoints or just prices?', { prob: 85, comm: 100, prof: 95 }), o("That wasn't in the original ticket.", { prob: 20, comm: 30, prof: 25 })] },
  ],
},
/* ------------------------------------------------------------ DAY 2 */
{
  title: 'Day 2: Ship it',
  blurb: 'A deploy is scheduled this afternoon. Review code, fix async bugs and keep to the clock.',
  meeting: { at: m(11), len: 25, label: 'Daily sync', q: {
    from: 'Dana (Manager)', text: "In the sync: 'Anyone at risk of missing the deploy window?'", deadline: 15,
    opts: [o('I might be tight on BUG-140. I will confirm by 1pm.', { comm: 100, prof: 100, prob: 90 }), o("No, I'm fine.", { comm: 60, prof: 60 }), o('(say nothing)', { comm: 0, prof: 20 })] } },
  tickets: [
    { id: 'BUG-131', title: 'Orders marked saved before they are saved', type: 'choice', avail: m(9, 10), due: m(11, 30),
      spec: 'Users see "Done!" but half of their items are missing. The save function is async.',
      code: "items.forEach(async (item) => {\n  await save(item);\n});\nshowDone();",
      opts: ['`await Promise.all(items.map(save));` then `showDone();`', 'Wrap showDone() in setTimeout with 1000ms', 'Make showDone() an async function'],
      ok: 0, why: ['', 'A fixed delay is a guess and will fail on slow connections.', "Making showDone async doesn't make it wait for the saves."],
      hint: 'forEach does not wait for async callbacks. Collect the promises instead.' },
    { id: 'REVIEW-12', title: "Review Priya's login PR", type: 'text', avail: m(11, 30), due: m(14), award: ['tech', 'comm', 'prof'],
      spec: "Priya asked for a review. Write a short, constructive comment on this change.",
      code: "app.post('/signup', (req, res) => {\n  db.users.insert({\n    email: req.body.email,\n    password: req.body.password,\n  });\n  res.send('ok');\n});",
      prompt: 'Write your review comment (what is wrong, why, and what to do instead).',
      groups: [['hash', 'bcrypt', 'argon', 'scrypt', 'salt'], ['plain', 'clear text', 'cleartext', 'insecure', 'unsafe', 'security', 'leak', 'breach'], ['please', 'suggest', 'could', 'consider', 'thanks', 'thank', 'would', 'maybe']], minLen: 80,
      hint: 'Look at how the password is stored. Mention the risk and a safer alternative, politely.' },
    { id: 'BUG-140', title: 'Average is always off by one', type: 'line', avail: m(13), due: m(15, 30),
      spec: 'The average score on the dashboard is wrong. Click the line that contains the bug, then choose the fix.',
      code: "function average(nums) {\n  let sum = 0;\n  for (const n of nums) sum += n;\n  return sum / nums.length - 1;\n}",
      bugLine: 4, lineWhy: 'That line is fine. Re-read what each line is meant to do.',
      opts: ['`return sum / nums.length;`', '`return sum / (nums.length + 1);`', '`return sum - 1;`'],
      ok: 0, why: ['', 'That divides by the wrong count.', 'That is not an average at all.'],
      hint: 'The sum and the loop are fine. Look at what happens to the result.' },
  ],
  events: [
    { at: m(9, 2), from: 'Dana (Manager)', text: "Deploy is this afternoon. Priority is the order bug, then reviews. Shout if anything looks risky.", deadline: 40,
      opts: [o("Understood. I'll start with BUG-131 and keep you posted.", { comm: 100, prof: 100 }), o('ok', { comm: 40, prof: 50 }), o('That seems like too much for one day.', { comm: 40, prof: 30 })] },
    { at: m(10, 15), from: 'Priya', text: "Could you review my login PR when you have a moment? It's blocking me a little.", deadline: 45,
      opts: [o("Sure. I'll take a look after my current ticket, by 12.", { comm: 100, prof: 100 }), o("Yes, right now!", { comm: 80, prof: 70 }), o("I'm busy.", { comm: 10, prof: 10 })] },
    { at: m(13, 30), from: 'Leo', text: "The team is ordering pizza for lunch. Want in?", deadline: 40,
      opts: [o("Thanks, I'd love to join!", { comm: 90, prof: 85 }), o("Can't today, deadline. Maybe tomorrow!", { comm: 95, prof: 95 }), o('Not interested.', { comm: 20, prof: 20 })] },
    { at: m(15), from: 'Dana (Manager)', text: 'The deploy window just moved an hour earlier. Can you still ship BUG-140?', deadline: 30,
      opts: [o("Yes, it's a small fix. I'll finish it before the new cutoff.", { prob: 100, comm: 95, prof: 95 }), o('Probably.', { prob: 55, comm: 50, prof: 60 }), o("Impossible. That's unreasonable.", { prob: 15, comm: 20, prof: 15 })] },
  ],
},
/* ------------------------------------------------------------ DAY 3 */
{
  title: 'Day 3: Production incident',
  blurb: 'Something is broken in production. Stay calm, find the cause and communicate clearly.',
  tickets: [
    { id: 'INC-001', title: 'Login page returns server errors', type: 'line', avail: m(9, 25), due: m(11, 30), prob: true,
      spec: 'Production alert: some users get 500 errors on login. Click the vulnerable line in the query code, then choose the fix.',
      code: "function findUser(name) {\n  const sql = \"SELECT * FROM users WHERE name = '\" + name + \"'\";\n  return db.query(sql);\n}",
      bugLine: 2, lineWhy: 'That line is fine. Look at how user input reaches the database.',
      opts: ['Use a parameterized query: `db.query("SELECT * FROM users WHERE name = ?", [name])`', 'Remove quote characters from the name with a regex', 'Wrap the query in try/catch and return null'],
      ok: 0, why: ['', 'Blacklisting characters is fragile and easy to get around.', 'That hides the error but leaves the hole open.'],
      hint: 'User input is being glued straight into SQL. There is a standard safe way to pass values.' },
    { id: 'INC-002', title: 'Write the incident update', type: 'text', avail: m(11, 30), due: m(14), award: ['comm', 'prof', 'prob'],
      spec: 'Dana needs a short written update for the customer success team.',
      code: '', prompt: 'Write the update. Cover what happened, the impact, the fix and what happens next.',
      groups: [['happen', 'error', 'issue', 'outage', 'incident', 'bug'], ['impact', 'affect', 'users', 'customers', 'login'], ['fix', 'fixed', 'resolved', 'patch', 'deployed'], ['next', 'monitor', 'prevent', 'follow', 'follow-up', 'review']], minLen: 100,
      hint: 'Good incident updates answer four questions: what happened, who it hit, what you did, what comes next.' },
    { id: 'FEAT-160', title: 'Pick the right status code', type: 'choice', avail: m(14), due: m(16, 30),
      spec: 'The API should respond when a request arrives without a valid login. Which HTTP status code should it return?',
      code: "app.get('/profile', (req, res) => {\n  if (!req.user) {\n    return res.status(???).json({ error: 'Please log in' });\n  }\n  res.json(req.user);\n});",
      opts: ['401 Unauthorized', '200 OK', '500 Internal Server Error'],
      ok: 0, why: ['', '200 means success, which is misleading here.', '500 means the server failed. This is the client\'s authentication problem.'],
      hint: 'The client has not proved who they are. That has its own status code.' },
  ],
  events: [
    { at: m(9, 20), from: 'Dana (Manager)', text: 'URGENT: production is throwing errors on login. Customers are affected. What do you do?', deadline: 20, urgent: true,
      opts: [o("I'll check the logs and the login code first and update you in 15 minutes.", { prob: 100, comm: 100, prof: 100 }), o('Roll back immediately, no need to tell anyone.', { prob: 40, comm: 20, prof: 30 }), o("That's not my area.", { prob: 0, comm: 0, prof: 0 })] },
    { at: m(12, 15), from: 'Mei', text: "That was a stressful morning! Could you pair with me on my test this afternoon?", deadline: 40,
      opts: [o("Of course. Let's do 2:30 after I finish my update.", { comm: 100, prof: 100 }), o("Maybe. Let's see how the day goes.", { comm: 60, prof: 60 }), o('No.', { comm: 10, prof: 15 })] },
    { at: m(14, 30), from: 'Dana (Manager)', text: "Customer success wants an ETA on the full fix. What can you tell me?", deadline: 30,
      opts: [o("The urgent fix is live. I'll finish the follow-up checks by 4pm and send a summary.", { prob: 100, comm: 100, prof: 100 }), o('Soon.', { prob: 30, comm: 20, prof: 40 }), o("I can't promise anything.", { prob: 25, comm: 30, prof: 30 })] },
  ],
},
/* ------------------------------------------------------------ DAY 4 */
{
  title: 'Day 4: Planning',
  blurb: 'Fewer fires, more teamwork. Attend planning, review a teammate and keep your code clean.',
  meeting: { at: m(11), len: 30, label: 'Sprint planning', q: {
    from: 'Dana (Manager)', text: "In planning: 'Which of the open tasks would you like to own next sprint?'", deadline: 15,
    opts: [o("I'd like the pagination work. I've seen the data shape already.", { comm: 100, prof: 100, prob: 90 }), o('Whatever you think.', { comm: 40, prof: 55 }), o('(say nothing)', { comm: 0, prof: 20 })] } },
  tickets: [
    { id: 'BUG-170', title: 'Sorting changes the original list', type: 'choice', avail: m(9, 10), due: m(11),
      spec: 'The product list reorders itself after you sort a copy of it.',
      code: "function sortedByPrice(items) {\n  return items.sort((a, b) => a.price - b.price);\n}",
      opts: ['Sort a copy: `[...items].sort(...)`', 'Call `items.reverse()` afterwards', 'Rename the function to `sortInPlace`'],
      ok: 0, why: ['', 'That would not stop the original from being changed.', 'Renaming does not change the behaviour.'],
      hint: '.sort() changes the array it is called on. What if you sorted a copy?' },
    { id: 'REVIEW-21', title: "Review Omar's pull request", type: 'text', avail: m(11, 30), due: m(14, 30), award: ['tech', 'comm', 'prof'],
      spec: "Omar's PR adds a discount feature with hard-coded numbers and no tests.",
      code: "function price(base) {\n  return base - base * 0.17325;\n}",
      prompt: 'Write your review comment. Be specific and kind.',
      groups: [['test', 'tests', 'unit test', 'coverage'], ['constant', 'magic', 'named', 'config', 'hard-coded', 'hardcoded', 'explain', 'readab', 'name'], ['please', 'suggest', 'could', 'consider', 'thanks', 'thank', 'would', 'nice']], minLen: 80,
      hint: 'Two things to raise: the unexplained number, and the missing tests. Be friendly.' },
    { id: 'BUG-180', title: 'Timer keeps running after leaving the page', type: 'choice', avail: m(13), due: m(16),
      spec: 'The browser slows down after visiting the dashboard a few times.',
      code: "useEffect(() => {\n  setInterval(tick, 1000);\n}, []);",
      opts: ['Return a cleanup: `const id = setInterval(tick, 1000); return () => clearInterval(id);`', 'Increase the interval to 10 seconds', 'Call tick() once at startup instead'],
      ok: 0, why: ['', 'A slower leak is still a leak.', "That removes the feature instead of fixing it."],
      hint: 'Every time the component mounts it starts a new timer that is never stopped.' },
  ],
  events: [
    { at: m(9, 2), from: 'Dana (Manager)', text: "Quieter day today. Planning is at 11 in the meeting corner. Please don't be late.", deadline: 40,
      opts: [o("Got it. I'll be there at 11 sharp.", { comm: 100, prof: 100 }), o('ok', { comm: 40, prof: 50 }), o('Do I have to go?', { comm: 20, prof: 10 })] },
    { at: m(13, 5), from: 'Omar', text: "Is it okay if I merge my PR without tests? I'm in a hurry.", deadline: 40,
      opts: [o("Let's add a couple of tests first. I can help if you want.", { comm: 100, prof: 100 }), o("Hmm... okay, just this once.", { comm: 40, prof: 30 }), o('Do whatever you want.', { comm: 10, prof: 10 })] },
    { at: m(15, 30), from: 'Dana (Manager)', text: "Quick check-in: how are you finding the work so far?", deadline: 40,
      opts: [o("Good. The incident was stressful but I learned a lot. I'd like more practice with reviews.", { comm: 100, prof: 100 }), o("Fine.", { comm: 40, prof: 60 }), o("Honestly, it's boring.", { comm: 30, prof: 20 })] },
  ],
},
/* ------------------------------------------------------------ DAY 5 */
{
  title: 'Day 5: Demo day',
  blurb: 'Last day. Ship your final changes, run the retro and show what you have learned.',
  meeting: { at: m(10), len: 25, label: 'Demo and retro', q: {
    from: 'Dana (Manager)', text: "In the retro: 'What is one thing you'd improve next time?'", deadline: 15,
    opts: [o("I'd ask for help earlier when I'm stuck. It saves everyone time.", { comm: 100, prof: 100, prob: 95 }), o('Nothing, really.', { comm: 40, prof: 40 }), o('Other people should work faster.', { comm: 10, prof: 5 })] } },
  tickets: [
    { id: 'BUG-205', title: 'Adults aged exactly 18 are rejected', type: 'choice', avail: m(9, 10), due: m(11, 30),
      spec: 'The signup form must accept anyone aged 18 and over. 18-year-olds are being rejected.',
      code: "if (user.age > 18) {\n  allowSignup();\n}",
      opts: ['Use `>=`: `if (user.age >= 18)`', 'Use `> 17.5`', 'Remove the age check'],
      ok: 0, why: ['', 'That works for whole ages by accident but hides the intent.', 'The requirement still needs an age check.'],
      hint: '"18 and over" includes 18. Which comparison includes the boundary?' },
    { id: 'FEAT-200', title: 'Design pagination for the feed', type: 'choice', avail: m(11, 30), due: m(14), prob: true,
      spec: 'The activity feed gets new items every few seconds. Which pagination approach avoids showing duplicates when new items arrive?',
      code: "GET /feed?offset=40&limit=20     // option A\nGET /feed?after=<last-id>&limit=20   // option B",
      opts: ['Cursor-based (`after=<last-id>`)', 'Offset-based (`offset=40`)', 'Load all items at once'],
      ok: 0, why: ['', 'With new items arriving, the offsets shift and you will see duplicates or skip items.', "That will not scale as the feed grows."],
      hint: 'If the list changes underneath you, a position in the list moves. An anchor to a specific item does not.' },
    { id: 'RETRO-1', title: 'Write your retrospective', type: 'text', avail: m(13), due: m(16), award: ['comm', 'prof', 'prob'],
      spec: 'Close out the week with a short written retrospective for the team.',
      code: '', prompt: 'What went well, what could improve, and one action you will take next time?',
      groups: [['went well', 'good', 'proud', 'learned', 'enjoyed', 'helped'], ['improve', 'better', 'next time', 'could', 'struggled', 'harder'], ['action', 'will', 'plan', 'going to', 'commit', 'practice']], minLen: 120,
      hint: 'A good retro has three parts: a win, an improvement and a concrete next step.' },
  ],
  events: [
    { at: m(9, 2), from: 'Dana (Manager)', text: "Last day. Finish your tickets, then we demo at 10. Proud of how you've done this week.", deadline: 40,
      opts: [o("Thanks Dana. I'm excited to show the team.", { comm: 100, prof: 100 }), o('ok', { comm: 40, prof: 50 }), o("Can't wait for this to be over.", { comm: 20, prof: 10 })] },
    { at: m(13, 30), from: 'Priya', text: "We're all signing a card for the intern week. Want to add a note?", deadline: 45,
      opts: [o("Absolutely. I'll write something nice.", { comm: 100, prof: 100 }), o('Sure, if I have time.', { comm: 60, prof: 65 }), o('No thanks.', { comm: 20, prof: 25 })] },
    { at: m(15), from: 'Dana (Manager)', text: "Before you go: any feedback on how we can make onboarding better?", deadline: 40,
      opts: [o("A short written guide to the tools would help. Otherwise the team was great.", { comm: 100, prof: 100, prob: 90 }), o('It was fine.', { comm: 40, prof: 60 }), o('I have lots of complaints.', { comm: 30, prof: 20 })] },
  ],
},
];

/* generic chat when the player walks up to a coworker and presses E */
const TALK = [
  { text: "Hey! How's your day going?", opts: [o("Busy but good. How about you?", { comm: 90, prof: 90 }), o('Fine.', { comm: 40, prof: 50 }), o("Don't bug me.", { comm: 5, prof: 0 })] },
  { text: "Did you see the sunrise over the buildings this morning? Nice view from here.", opts: [o("I did, it's a great office. Worth the commute!", { comm: 85, prof: 85 }), o('Not really.', { comm: 45, prof: 50 })] },
  { text: "I'm making a coffee run later. Want anything?", opts: [o("That's kind, thanks! A black coffee would be great.", { comm: 90, prof: 90 }), o('No thanks, I have water.', { comm: 70, prof: 75 }), o('Why are you asking me?', { comm: 10, prof: 10 })] },
];

window.Content = { m, MODES, SPEEDS, DAYS, TALK };
})();
