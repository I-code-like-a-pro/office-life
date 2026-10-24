/* OfficeLife content, part 2: cozy extras (bonus coding tasks, styles, decor, friendship stories, personas). Extends window.Content. */
(function () {
'use strict';
const C = window.Content, m = C.m;

/* ---- optional bonus coding tasks (real tests run in a sandboxed worker) ---- */
const BONUS = [
  { id: 'CODE-1', title: 'Bonus: write fizzbuzz(n)', type: 'code', optional: true, avail: m(9, 30), due: m(17), fn: 'fizzbuzz', coins: 12,
    spec: "Write fizzbuzz(n). Return 'Fizz' if n is divisible by 3, 'Buzz' if by 5, 'FizzBuzz' if by both, otherwise the number as a string.",
    starter: 'function fizzbuzz(n) {\n  // your code here\n}',
    tests: [{ args: [3], expect: 'Fizz' }, { args: [5], expect: 'Buzz' }, { args: [15], expect: 'FizzBuzz' }, { args: [7], expect: '7' }],
    hint: 'The % operator gives the remainder. Check the "both" case first.' },
  { id: 'CODE-2', title: 'Bonus: a safe average()', type: 'code', optional: true, avail: m(9, 30), due: m(17), fn: 'average', coins: 12,
    spec: 'Write average(nums) that returns the mean of an array. For an empty array return 0 (no crashing, no NaN).',
    starter: 'function average(nums) {\n  // your code here\n}',
    tests: [{ args: [[2, 4, 6]], expect: 4 }, { args: [[5]], expect: 5 }, { args: [[]], expect: 0 }],
    hint: 'Handle the empty case first, then sum and divide.' },
  { id: 'CODE-3', title: 'Bonus: slugify(title)', type: 'code', optional: true, avail: m(9, 30), due: m(17), fn: 'slugify', coins: 14,
    spec: "Write slugify(title): lowercase, trim, and replace any run of non-letters/digits with a single '-'. 'Hello World!' becomes 'hello-world'.",
    starter: 'function slugify(title) {\n  // your code here\n}',
    tests: [{ args: ['Hello World!'], expect: 'hello-world' }, { args: ['  Cozy   Office '], expect: 'cozy-office' }, { args: ['Day 3: Incident'], expect: 'day-3-incident' }],
    hint: "A regular expression like /[^a-z0-9]+/g helps. Don't leave dashes at the ends." },
  { id: 'CODE-4', title: 'Bonus: unique(arr)', type: 'code', optional: true, avail: m(9, 30), due: m(17), fn: 'unique', coins: 14,
    spec: 'Write unique(arr) that removes duplicates but keeps the first occurrence order.',
    starter: 'function unique(arr) {\n  // your code here\n}',
    tests: [{ args: [[1, 2, 2, 3, 1]], expect: [1, 2, 3] }, { args: [['a', 'a']], expect: ['a'] }, { args: [[]], expect: [] }],
    hint: 'A Set remembers what you have seen. Spread it back into an array.' },
  { id: 'CODE-5', title: 'Bonus: groupByLength(words)', type: 'code', optional: true, avail: m(9, 30), due: m(17), fn: 'groupByLength', coins: 16,
    spec: 'Write groupByLength(words) returning an object whose keys are word lengths and values are arrays of those words.',
    starter: 'function groupByLength(words) {\n  // your code here\n}',
    tests: [{ args: [['a', 'bb', 'c']], expect: { 1: ['a', 'c'], 2: ['bb'] } }, { args: [[]], expect: {} }, { args: [['hi', 'yo', 'hey']], expect: { 2: ['hi', 'yo'], 3: ['hey'] } }],
    hint: 'Loop over words, use word.length as the key, and push into an array for that key.' },
];
BONUS.forEach((t, i) => { if (C.DAYS[i]) C.DAYS[i].tickets.push(t); });

const STYLES = [
  { id: 'cozy', label: 'Cozy', blurb: 'Relax. No failing, no deadline pressure. Mistakes are just lessons.' },
  { id: 'career', label: 'Career', blurb: 'Scored like a real job, with deadlines and a certificate.' },
];
C.SPEEDS.push({ id: 'relaxed', label: 'Relaxed (about 15 min per day)', secPerMin: 1.8 });

/* ---- things you can buy with coins ---- */
const DECOR = [
  { id: 'cactus', name: 'Desk cactus', price: 25, where: 'your desk', desc: 'A tiny prickly friend.' },
  { id: 'frame', name: 'Photo frame', price: 25, where: 'your desk', desc: 'Happy faces to look at.' },
  { id: 'robot', name: 'Toy robot', price: 40, where: 'your desk', desc: 'Judges your code, kindly.' },
  { id: 'lights', name: 'Fairy lights', price: 60, where: 'your desk', desc: 'A warm glow above your monitor.' },
  { id: 'rug_pink', name: 'Pink rug', price: 50, where: 'apartment', desc: 'Soft under your feet.' },
  { id: 'poster', name: 'Dreamy poster', price: 35, where: 'apartment', desc: 'Pastel skies for the wall.' },
  { id: 'floor_lamp', name: 'Floor lamp', price: 45, where: 'apartment', desc: 'Cozy evening light.' },
  { id: 'plant_big', name: 'Leafy plant', price: 40, where: 'apartment', desc: 'Fresh air vibes.' },
];

/* ---- friendship story beats (shown once, when hearts reach the level) ---- */
const STORIES = {
  priya: [
    { lvl: 1, topic: 'her secret project', lines: ["Can I tell you a secret? I'm thinking about starting a little podcast about people's first jobs.", "I'm terrified nobody will listen, honestly.", '...Thanks for not laughing. It helps just to say it out loud.'], reward: { coins: 8, mood: 8 } },
    { lvl: 3, topic: 'the podcast', lines: ['Episode one is live! My mum is my only listener so far, ha.', 'But she cried a little. So that counts, right?', "You're welcome on an episode any time. You have a good story already."], reward: { coins: 15, mood: 12 } },
  ],
  sam: [
    { lvl: 1, topic: 'work nerves', lines: ['Can I confess something? I get nervous before every demo.', "I rehearse in the stairwell. Don't tell anyone.", "Somehow it's easier knowing someone else knows."], reward: { coins: 8, mood: 8 } },
    { lvl: 3, topic: 'the big demo', lines: ['I did the demo without the stairwell rehearsal. My hands shook, but it went fine!', 'Everyone just wanted it to work. Funny how that is.', "Coffee's on me next time."], reward: { coins: 15, mood: 12 } },
  ],
  leo: [
    { lvl: 1, topic: 'his new flat', lines: ["I'm moving flats this weekend. Third floor, no lift.", 'I own far too many books. My back already hurts.', 'If you hear a crash on Monday, that was a box of novels.'], reward: { coins: 8, mood: 8 } },
    { lvl: 3, topic: 'moving day', lines: ["It's done! The sofa fit through the door by two centimetres.", 'There is a tiny balcony. I put a chair on it and sat there like a king.', 'You should come see it. Bring plants.'], reward: { coins: 15, mood: 12 } },
  ],
  mei: [
    { lvl: 1, topic: 'her plants', lines: ["Do you see the plant by the window? That's Gerald. I water him on Tuesdays.", 'I name all my plants. Gerald, Beyonce and Susan.', 'People think it is odd, but they never die on me.'], reward: { coins: 8, mood: 8 } },
    { lvl: 3, topic: 'a little cutting', lines: ['Beyonce had babies. Well, cuttings. I potted one for you.', 'Put it somewhere with light and talk to it now and then.', "That's all it takes. For plants and people, I think."], reward: { coins: 15, mood: 12 } },
  ],
  omar: [
    { lvl: 1, topic: 'running', lines: ["I'm training for a half marathon. Up at six every morning.", "Please don't ask how I look at ten past nine.", 'Okay, a bit pale. But I feel amazing.'], reward: { coins: 8, mood: 8 } },
    { lvl: 3, topic: 'race day', lines: ['I finished! Two hours nine minutes. Last in my age group, first in my heart.', 'A stranger handed me an orange at kilometre 18. Best orange of my life.', 'Thanks for listening to me ramble all those mornings.'], reward: { coins: 15, mood: 12 } },
  ],
  dana: [
    { lvl: 1, topic: 'her first day', lines: ['On my first day in an office I got lost and ended up in the cleaning cupboard.', 'I stayed in there for ten minutes pretending to look for a stapler.', "Everyone is a beginner once. You're doing well."], reward: { coins: 10, mood: 10 } },
    { lvl: 3, topic: 'being a manager', lines: ['The best part of managing is watching someone fix a bug and light up.', "That 'oh, I get it!' moment is why I do this.", "You've had a lot of them lately. It's lovely to watch."], reward: { coins: 20, mood: 15 } },
  ],
};

/* ---- personas for the optional AI conversation, and offline reply lines ---- */
const PERSONAS = {
  priya: 'Priya is a warm, bubbly senior developer who loves podcasts and is secretly nervous about starting her own.',
  sam: 'Sam is a thoughtful, slightly anxious engineer who loves coffee and rehearses demos in the stairwell.',
  leo: 'Leo is a dry-humoured, easygoing tester who owns too many books and just moved flats.',
  mei: 'Mei is a calm, kind designer who names her plants (Gerald, Beyonce, Susan) and speaks gently.',
  omar: 'Omar is an enthusiastic, sporty developer training for a half marathon who is always cheerful.',
  dana: 'Dana is the friendly, encouraging engineering manager. She wants the new graduate to feel safe and grow.',
};
const REPLIES = {
  greet: ['Hey there! Lovely to see you.', 'Hi! Good timing, I needed a break.', 'Hello! How is your day so far?'],
  how: ["Honestly? Pretty good. A quiet day is a gift.", "Can't complain. The coffee helped.", "I'm doing alright. Thanks for asking, that's kind."],
  thanks: ['Anytime!', 'Of course. We look out for each other here.', "No problem at all, that's what teammates are for."],
  work: ["Take it one step at a time. Read the error, then the code, then breathe.", "If you're stuck, say so early. Nobody minds, honestly.", "Small pieces, one at a time. Works for me every time."],
  social: ['Ooh, that sounds nice. I could use something like that.', "That's a good idea. We should do it sometime.", 'Now you have me thinking about lunch.'],
  compliment: ["Aw, you're sweet. Thank you!", 'That made my day, honestly.', "Thanks! That's really kind of you to say."],
  rude: ["Hm. I'll give you a minute. Maybe we can try again later.", "That didn't feel great to hear, but I'll let it go.", "Let's reset. I'm happy to chat when you are."],
  question: ["Good question. I'd have to think about that one.", "Hmm, I'm not sure. What do you think?", 'Interesting! I have not thought about it that way.'],
  fallback: ['Mm-hm, tell me more.', "That's interesting. Go on.", 'I hear you.', 'Ha, fair enough!'],
};

Object.assign(C, { STYLES, DECOR, STORIES, PERSONAS, REPLIES });
})();
