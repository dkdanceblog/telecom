const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const W = canvas.width;
const H = canvas.height;

const img = (src) => { const i = new Image(); i.src = src; return i; };
const assets = {
  bg: img('assets/bg/background.png'),
  final: img('assets/bg/final.png'),
  idle: img('assets/player/idle.png'),
  left: img('assets/player/left.png'),
  right: img('assets/player/right.png'),
  croissant: img('assets/recovery/kroasan.png'),
  khinkali: img('assets/recovery/hinkali.png'),
  borjomi: img('assets/recovery/borgomi.png'),
  coffee: img('assets/recovery/coffee.png'),
  memes: ['assets/memes/mem1.jpg', 'assets/memes/mem2.jpg', 'assets/memes/mem3.jpg', 'assets/memes/mem4.jpg', 'assets/memes/mem5.jpg', 'assets/memes/mem6.jpg', 'assets/memes/mem7.jpg', 'assets/memes/mem8.jpg', 'assets/memes/mem9.jpg', 'assets/memes/mem10.jpg'].map(img),
};


const officeAudio = new Audio('assets/audio/zvuk-ofisa_001.mp3');
officeAudio.loop = true;
officeAudio.volume = 0.16;
officeAudio.preload = 'auto';

const SFX_VOLUME = 0.42;
const sounds = {
  task: new Audio('assets/audio/task.wav'),
  message: new Audio('assets/audio/message.wav'),
  coffee: new Audio('assets/audio/coffee.wav'),
  food: new Audio('assets/audio/food.wav'),
  meme: new Audio('assets/audio/meme.wav'),
  like: new Audio('assets/audio/like.wav'),
  dayoff: new Audio('assets/audio/dayoff.wav'),
  nextday: new Audio('assets/audio/nextday.wav'),
  pause: new Audio('assets/audio/pause.wav'),
  burnout: new Audio('assets/audio/vigaranie.wav'),
  win: new Audio('assets/audio/win.wav'),
};
Object.values(sounds).forEach(a => { a.preload = 'auto'; a.volume = SFX_VOLUME; });

function playSfx(name, volume = SFX_VOLUME) {
  if (audioMuted) return;
  const base = sounds[name];
  if (!base) return;
  try {
    const a = base.cloneNode(true);
    a.volume = volume;
    a.play().catch(() => {});
  } catch (e) {}
}


function playOfficeAudio() {
  if (audioMuted) return;
  if (officeAudio.paused) {
    officeAudio.currentTime = officeAudio.currentTime || 0;
    officeAudio.play().catch(() => {});
  }
}

function pauseOfficeAudio() {
  if (!officeAudio.paused) officeAudio.pause();
}

function applyAudioState() {
  officeAudio.volume = audioMuted ? 0 : 0.16;
  if (audioMuted) pauseOfficeAudio();
  else if (gameState === 'play') playOfficeAudio();
}

function toggleSound() {
  audioMuted = !audioMuted;
  applyAudioState();
  if (!audioMuted) playSfx('pause', 0.28);
}

const WEEK_DAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ'];
const DAY_MS = 60000;
const GAME_MS = DAY_MS * 5;

const taskTexts = [
  'собрать статистику',
  'ответить клиенту',
  'ответить от лица бренда',
  'комментить от лица бренда',
  'сделать заходы в посевы',
  'придумать визуалы посевов',
  'собрать идеи стикеров',
  'сделать спец на посевы',
  'придумать большой конкурс',
  'снять вирусный ролик',
  'найти свежие тренды',
  'придумать вординги',
  'сделать игру на ду ю ноу',
  'найти новые мемы',
  'собрать темы постов',
  'подготовить копирайт',
  'собрать референсы',
  'адаптировать пост',
  'согласовать идеи',
  'написать ТЗ',
  'найти блогеров',
  'придумать спецпроект',
  'собрать отчёт',
  'проверить пост',
  'передать задачу',
  'внести правки',
];

const messageTexts = [
  'Так, коллеги',
  'На будущее',
  'Выводы сделайте',
  'Ловите правки',
  'АСАП',
  'До конца дня сделаете?',
  'Сроки горят',
];

const memeTexts = [
  'Мем из рабочего\nчата',
  'Смешная картинка\nможно выдохнуть',
  'Коллега прислал мем\nминус тревога',
  'Пять минут смеха\nи снова в бой',
];

const callTexts = [
  'Созвон, который\nмог быть письмом',
  'Быстрый созвон\nна 40 минут',
  'Давайте обсудим\nголосом',
  'Надо синкнуться\nпо задаче',
];

const asapTexts = [
  'АСАП\nещё вчера',
  'АСАП\nгорит дедлайн',
  'АСАП\nвсё срочно',
  'АСАП\nнужен апдейт',
];

const bigTaskTexts = [
  'СРОЧНО НУЖЕН ПОСЕВ',
  'АСАП МОЗГОВОЙ ШТУРМ',
  'НУЖЕН БОЛЬШОЙ СПЕЦ',
];

const telekomychReactions = [
  'ух, когда уже конец дня',
  'надо бахнуть Боржоми...',
  'господи помилуй',
  'телеком-телеком, будь со мной целиком',
  'выходные уже скоро...',
  'боже дай мне сил',
];

function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

let nextReactionAt = randInt(16, 24);

const cardColors = ['#fff4b8', '#ffe0ea', '#d6f1ff', '#e0ffbd', '#f1dcff', '#ffe0b8'];

const player = { x: W / 2, y: 835, baseY: 835, w: 260, h: 390, speed: 12, dir: 'idle', vy: 0, jumping: false };
let keys = {}, tasks = [], score = 0, caught = 0, lives = 3;
let gameState = 'start', lastSpawn = 0, spawnGap = 1750, levelTime = 0, gameStartAt = 0, lastDay = 0;
let coffeeBoostUntil = 0, slowdownUntil = 0, burnoutUntil = 0, fridayUntil = 0;
let stress = 0, burnouts = 0, messagesCaught = 0, callsCaught = 0, asapCaught = 0;
let message = '', messageUntil = 0;
let pausedAt = 0;
let audioMuted = false;

const pauseButton = { x: W - 168, y: 150, w: 64, h: 58 };
const soundButton = { x: W - 92, y: 150, w: 64, h: 58 };
const resumeButton = { x: W / 2 - 220, y: H / 2 - 20, w: 440, h: 120 };

function uiHit(pos, r) {
  return pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h;
}

function pointerToCanvas(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function reset() {
  tasks = [];
  score = 0;
  caught = 0;
  lives = 3;
  gameState = 'play';
  lastSpawn = 0;
  spawnGap = 1750;
  levelTime = 0;
  gameStartAt = performance.now();
  lastDay = 0;
  coffeeBoostUntil = 0;
  slowdownUntil = 0;
  burnoutUntil = 0;
  fridayUntil = 0;
  stress = 0;
  burnouts = 0;
  messagesCaught = 0;
  callsCaught = 0;
  asapCaught = 0;
  message = '';
  messageUntil = 0;
  pausedAt = 0;
  player.x = W / 2;
  player.y = player.baseY;
  player.vy = 0;
  player.jumping = false;
  nextReactionAt = randInt(16, 24);
  say('Понедельник. Пока спокойно.', 1800);
  playOfficeAudio();
}


function say(text, ms = 1600) {
  message = text;
  messageUntil = performance.now() + ms;
}

function gameClockNow() {
  return gameState === 'pause' && pausedAt ? pausedAt : performance.now();
}

function getDayIndex() {
  if (!gameStartAt) return 0;
  return Math.min(4, Math.floor((gameClockNow() - gameStartAt) / DAY_MS));
}

function getDayProgress() {
  if (!gameStartAt) return 0;
  return Math.max(0, Math.min(1, ((gameClockNow() - gameStartAt) % DAY_MS) / DAY_MS));
}

function getDayName() {
  return WEEK_DAYS[getDayIndex()];
}

function chooseType(day, difficulty) {
  const r = Math.random();
  const friday = day === 4;
  const chances = {
    coffee: 0.052,
    croissant: 0.045,
    khinkali: 0.022,
    borjomi: 0.022,
    meme: 0.09,
    like: 0.045,
    dayoff: 0.012,
    workmsg: day >= 1 ? 0.09 + difficulty * 0.05 + (friday ? 0.08 : 0) : 0.015,
    call: day >= 2 ? 0.055 + difficulty * 0.035 + (friday ? 0.065 : 0) : 0,
    asap: day >= 3 ? 0.035 + difficulty * 0.025 + (friday ? 0.06 : 0) : 0,
    bigTask: day >= 3 ? 0.018 + (friday ? 0.032 : 0) : 0,
  };
  let cursor = 0;
  if (r < (cursor += chances.coffee)) return 'coffee';
  if (r < (cursor += chances.croissant)) return 'croissant';
  if (r < (cursor += chances.khinkali)) return 'khinkali';
  if (r < (cursor += chances.borjomi)) return 'borjomi';
  if (r < (cursor += chances.meme)) return 'meme';
  if (r < (cursor += chances.like)) return 'like';
  if (r < (cursor += chances.dayoff)) return 'dayoff';
  if (r < (cursor += chances.workmsg)) return 'workmsg';
  if (r < (cursor += chances.call)) return 'call';
  if (r < (cursor += chances.asap)) return 'asap';
  if (r < (cursor += chances.bigTask)) return 'bigTask';
  return 'task';
}

function spawnTask(now) {
  const day = getDayIndex();
  const difficulty = Math.min(1, levelTime / GAME_MS);
  const type = chooseType(day, difficulty);
  const isCard = ['task', 'workmsg', 'call', 'asap', 'bigTask'].includes(type);
  const isAsap = type === 'asap';
  tasks.push({
    x: 120 + Math.random() * (W - 240),
    y: isAsap ? -150 : -100,
    w: type === 'meme' ? 240 : (type === 'bigTask' ? 430 : (isCard ? (isAsap ? 210 : 230) : 92)),
    h: type === 'meme' ? 240 : (type === 'bigTask' ? 205 : (isCard ? (isAsap ? 128 : 138) : 92)),
    speed: baseFallSpeed(type, day, difficulty, now),
    color: cardColors[Math.floor(Math.random() * cardColors.length)],
    text: textForType(type),
    type,
    rot: (Math.random() - .5) * (isAsap ? .16 : .08),
    flicker: Math.random() * 1000,
    memeIndex: type === 'meme' ? Math.floor(Math.random() * assets.memes.length) : 0,
  });
  lastSpawn = now;
  const fridayGap = day === 4 ? 0.56 : 1;
  const dayHardness = [1.2, 1.0, 0.86, 0.72, 0.50][day];
  spawnGap = Math.max(300, (1650 - levelTime * 0.0034) * dayHardness * fridayGap);
}

function baseFallSpeed(type, day, difficulty, now) {
  let sp = 2.05 + Math.random() * .95 + day * .35 + difficulty * 1.6;
  if (type === 'coffee' || type === 'croissant' || type === 'khinkali' || type === 'borjomi' || type === 'like' || type === 'dayoff') sp *= .9;
  if (type === 'workmsg') sp *= 1.04;
  if (type === 'call') sp *= 1.16;
  if (type === 'meme') sp *= .96;
  if (type === 'asap') sp *= 2.1;
  if (type === 'bigTask') sp *= 0.82;
  if (day === 4) sp *= 1.22;
  if (now < fridayUntil) sp *= 1.12;
  return sp;
}

function textForType(type) {
  if (type === 'workmsg') return messageTexts[Math.floor(Math.random() * messageTexts.length)];
  if (type === 'meme') return memeTexts[Math.floor(Math.random() * memeTexts.length)];
  if (type === 'call') return callTexts[Math.floor(Math.random() * callTexts.length)];
  if (type === 'asap') return asapTexts[Math.floor(Math.random() * asapTexts.length)];
  if (type === 'bigTask') return bigTaskTexts[Math.floor(Math.random() * bigTaskTexts.length)];
  return taskTexts[Math.floor(Math.random() * taskTexts.length)];
}

function drawBackground() {
  ctx.drawImage(assets.bg, 0, 0, W, H);
  ctx.fillStyle = 'rgba(4, 3, 14, .18)';
  ctx.fillRect(0,0,W,H);
  if (gameState === 'play' && getDayIndex() === 4) {
    ctx.fillStyle = 'rgba(255,111,111,.08)';
    ctx.fillRect(0,0,W,H);
  }
  if (gameState === 'play' && performance.now() < fridayUntil) {
    ctx.fillStyle = 'rgba(186,255,111,.10)';
    ctx.fillRect(0,0,W,H);
  }
  if (gameState === 'play' && performance.now() < burnoutUntil) {
    ctx.fillStyle = 'rgba(25, 12, 35, .52)';
    ctx.fillRect(0,0,W,H);
  }
}

function roundRect(x,y,w,h,r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}

function wrapLines(text, maxChars = 15) {
  const raw = String(text).split('\n');
  const out = [];
  for (const part of raw) {
    const words = part.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (test.length > maxChars && line) {
        out.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
  }
  return out.slice(0, 4);
}

function drawTask(t) {
  ctx.save();
  ctx.translate(t.x + t.w/2, t.y + t.h/2);
  ctx.rotate(t.rot);
  ctx.translate(-t.w/2, -t.h/2);

  if (!['task', 'workmsg', 'call', 'asap', 'bigTask'].includes(t.type)) {
    const foodImages = { coffee: assets.coffee, croissant: assets.croissant, khinkali: assets.khinkali, borjomi: assets.borjomi, meme: assets.memes[t.memeIndex] };
    if (foodImages[t.type] && foodImages[t.type].complete) {
      if (t.type === 'meme') { ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#1b1528'; ctx.lineWidth = 5; roundRect(0,0,t.w,t.h,10); ctx.fill(); ctx.stroke(); ctx.save(); roundRect(6,6,t.w-12,t.h-12,7); ctx.clip(); ctx.drawImage(foodImages[t.type], 6, 6, t.w-12, t.h-12); ctx.restore(); }
      else ctx.drawImage(foodImages[t.type], 0, 0, t.w, t.h);
    } else {
      const palette = {
        coffee: '#f3e2cf',
        croissant: '#ffd074',
        khinkali: '#f4dcc2',
        borjomi: '#7edfd3',
        like: '#89d95b',
        dayoff: '#8fff8a',
        meme: '#d7f7ff',
      };
      ctx.fillStyle = palette[t.type] || '#d6ff91';
      ctx.strokeStyle = '#202030'; ctx.lineWidth = 5;
      roundRect(0,0,t.w,t.h,18); ctx.fill(); ctx.stroke();
      ctx.font = 'bold 52px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#211b2c';
      const icon = t.type === 'coffee' ? '☕' : t.type === 'croissant' ? '🥐' : t.type === 'khinkali' ? '🥟' : t.type === 'borjomi' ? '🧃' : t.type === 'meme' ? '😂' : t.type === 'like' ? '👍' : '📅';
      ctx.fillText(icon, t.w/2, t.h/2 + 2);
    }
    if (t.type === 'dayoff') {
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#211b2c';
      ctx.fillText('DAY OFF', t.w/2, t.h - 16);
    }
    ctx.restore(); return;
  }

  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 8;
  if (t.type === 'workmsg' || t.type === 'call') ctx.fillStyle = '#6b1422';
  else if (t.type === 'asap') ctx.fillStyle = '#ff7b36';
  else if (t.type === 'bigTask') ctx.fillStyle = getDayIndex() === 4 ? '#ffd36a' : '#fff0a8';
  else if (t.type === 'meme') ctx.fillStyle = '#d7f7ff';
  else ctx.fillStyle = t.color;
  ctx.strokeStyle = t.type === 'asap' || t.type === 'bigTask' ? '#ffd36a' : '#27192b'; ctx.lineWidth = t.type === 'asap' || t.type === 'bigTask' ? 6 : 5;
  roundRect(0,0,t.w,t.h,14); ctx.fill(); ctx.stroke();
  ctx.shadowColor = 'transparent';

  const fridayBurningTask = getDayIndex() === 4 && (t.type === 'task' || t.type === 'bigTask');
  if (t.type === 'asap' || fridayBurningTask) {
    ctx.fillStyle = Math.sin((performance.now() + t.flicker) * .018) > 0 ? '#fff0a8' : '#ff4242';
    ctx.font = t.type === 'bigTask' ? 'bold 34px serif' : 'bold 24px serif';
    ctx.fillText('🔥', 12, -10);
    ctx.fillText('🔥', t.w - 42, -8);
    ctx.fillText('🔥', t.w - 38, t.h + 6);
    if (t.type === 'bigTask') ctx.fillText('🔥', Math.floor(t.w / 2) - 18, -16);
  }

  ctx.fillStyle = t.type === 'workmsg' || t.type === 'call' ? '#1d0d16' : '#424052'; roundRect(t.w/2-28,-12,56,22,5); ctx.fill();
  ctx.strokeStyle = '#161322'; ctx.stroke();

  ctx.fillStyle = t.type === 'workmsg' || t.type === 'call' ? '#ffd1dc' : '#161322';
  ctx.font = 'bold 22px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  if (t.type === 'workmsg') { ctx.font = 'bold 20px monospace'; ctx.fillText('СООБЩЕНИЕ:', 20, 18); }
  if (t.type === 'call') { ctx.font = 'bold 20px monospace'; ctx.fillText('☎️ СОЗВОН', 20, 18); }
  if (t.type === 'meme') { ctx.font = 'bold 20px monospace'; ctx.fillText('😂 МЕМ', 20, 16); }
  if (t.type === 'asap') { ctx.font = 'bold 22px monospace'; ctx.fillText('🔥 ASAP', 20, 16); }
  if (t.type === 'bigTask') { ctx.font = 'bold 28px monospace'; ctx.fillText('ГОРИТ:', 24, 22); }
  const startY = t.type === 'workmsg' ? 52 : t.type === 'task' ? 26 : t.type === 'bigTask' ? 72 : 54;
  ctx.font = t.type === 'bigTask' ? 'bold 32px monospace' : t.type === 'asap' ? 'bold 24px monospace' : t.type === 'workmsg' || t.type === 'call' ? 'bold 20px monospace' : 'bold 22px monospace';
  const maxChars = t.type === 'bigTask' ? 17 : t.type === 'workmsg' ? 15 : t.type === 'asap' ? 12 : 15;
  const lines = wrapLines(t.text, maxChars);
  for (let i=0;i<lines.length;i++) ctx.fillText(lines[i], 20, startY + i*30);
  ctx.restore();
}

function drawPlayer() {
  const image = player.dir === 'left' ? assets.left : player.dir === 'right' ? assets.right : assets.idle;
  ctx.drawImage(image, player.x - player.w/2, player.y - player.h/2, player.w, player.h);
}

function drawHUD() {
  ctx.fillStyle = 'rgba(14,10,30,.78)'; ctx.strokeStyle = '#6a538f'; ctx.lineWidth = 3;
  roundRect(34,28,270,112,12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#baff6f'; ctx.font = 'bold 34px monospace'; ctx.fillText('СЧЁТ: ' + score, 58, 55);
  ctx.fillStyle = '#fff0a8'; ctx.font = 'bold 24px monospace'; ctx.fillText('ПОЙМАНО: ' + caught, 58, 98);

  ctx.fillStyle = 'rgba(14,10,30,.78)';
  ctx.strokeStyle = '#6a538f';
  roundRect(W-300,28,266,112,12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2b1436'; ctx.font = 'bold 30px monospace'; ctx.fillText('ЖИЗНИ:', W-272 + 2, 55 + 2);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 30px monospace'; ctx.fillText('ЖИЗНИ:', W-272, 55);
  ctx.font = '42px serif';
  for (let i=0;i<3;i++) ctx.fillText(i < lives ? '❤️' : '🖤', W-266 + i*66, 91);

  drawWeekBar();
  drawBurnoutMeter();
  drawTopButtons();
}

function drawWeekBar() {
  const x = W/2 - 350, y = 124, w = 700, h = 72;
  ctx.fillStyle = 'rgba(14,10,30,.82)'; ctx.strokeStyle = '#6a538f'; ctx.lineWidth = 3;
  roundRect(x,y,w,h,14); ctx.fill(); ctx.stroke();
  const active = getDayIndex();
  const dayW = w / 5;
  for (let i=0;i<5;i++) {
    const dx = x + i * dayW;
    ctx.fillStyle = i === active ? (i === 4 ? '#ff8fa7' : '#baff6f') : '#fff';
    ctx.font = 'bold 28px monospace'; ctx.textAlign = 'center';
    ctx.fillText(WEEK_DAYS[i], dx + dayW/2, y + 31);
    ctx.fillStyle = i < active ? '#baff6f' : i === active ? '#b983ff' : '#3c3158';
    roundRect(dx + 18, y + 44, dayW - 36, 14, 6); ctx.fill();
    if (i === active) {
      ctx.fillStyle = i === 4 ? '#ff8fa7' : '#fff0a8';
      roundRect(dx + 18, y + 44, (dayW - 36) * getDayProgress(), 14, 6); ctx.fill();
    }
  }
  ctx.textAlign = 'left';
}

function drawBurnoutMeter() {
  ctx.fillStyle = 'rgba(14,10,30,.86)';
  ctx.strokeStyle = '#b983ff';
  ctx.lineWidth = 3;
  roundRect(W/2 - 320, 22, 640, 92, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff0a8'; ctx.font = 'bold 25px monospace'; ctx.textAlign = 'center';
  ctx.fillText('ШКАЛА ВЫГОРАНИЯ', W/2, 53);
  const stressEmoji = stress < 35 ? '😌' : stress < 65 ? '😬' : stress < 90 ? '😵' : '🤯';
  const filledStress = Math.min(10, Math.ceil(stress / 10));
  let stressLine = '';
  for (let i = 0; i < 10; i++) stressLine += i < filledStress ? stressEmoji : '▫️';
  ctx.font = '27px serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(stressLine, W/2 - 22, 88);
  ctx.font = 'bold 21px monospace';
  ctx.fillStyle = stress > 75 ? '#ff8fa7' : stress > 45 ? '#fff0a8' : '#d6ff91';
  ctx.fillText(Math.round(stress) + '%', W/2 + 258, 88);
  ctx.textAlign = 'left';
}


function drawTopButtons() {
  const buttons = [
    { r: pauseButton, label: gameState === 'pause' ? '▶' : '⏸' },
    { r: soundButton, label: audioMuted ? '🔇' : '🔊' },
  ];
  for (const b of buttons) {
    ctx.fillStyle = 'rgba(14,10,30,.86)';
    ctx.strokeStyle = '#b983ff';
    ctx.lineWidth = 3;
    roundRect(b.r.x, b.r.y, b.r.w, b.r.h, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.label, b.r.x + b.r.w / 2, b.r.y + b.r.h / 2 + 1);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawPauseOverlay() {
  ctx.fillStyle = 'rgba(7,5,18,.76)'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle = '#fff0a8'; ctx.font = 'bold 76px monospace'; ctx.textAlign = 'center';
  ctx.fillText('ПАУЗА', W/2, H/2 - 125);

  ctx.fillStyle = 'rgba(186,255,111,.92)';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  roundRect(resumeButton.x, resumeButton.y, resumeButton.w, resumeButton.h, 24); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#211b2c';
  ctx.font = 'bold 58px monospace';
  ctx.fillText('▶', W/2, resumeButton.y + 58);
  ctx.font = 'bold 27px monospace';
  ctx.fillText('ПРОДОЛЖИТЬ', W/2, resumeButton.y + 96);

  ctx.fillStyle = '#ffffff';
  ctx.font = '22px monospace';
  ctx.fillText('Во время паузы управление не снимает игру с паузы', W/2, resumeButton.y + 165);
  ctx.textAlign = 'left';
}

function drawOverlay(title, text) {
  ctx.fillStyle = 'rgba(7,5,18,.72)'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle = '#b983ff'; ctx.font = 'bold 72px monospace'; ctx.textAlign = 'center';
  ctx.fillText(title, W/2, H/2 - 90);
  ctx.fillStyle = '#d6ff91'; ctx.font = 'bold 34px monospace';
  ctx.fillText(text, W/2, H/2 - 10);
  ctx.fillStyle = '#fff'; ctx.font = '24px monospace';
  ctx.fillText('Любая кнопка — старт. ← → или A/D — двигаться. ↑ — прыжок.', W/2, H/2 + 44);
  ctx.textAlign = 'left';
}

function drawWinOverlay() {
  if (assets.final && assets.final.complete) {
    ctx.drawImage(assets.final, 0, 0, W, H);
  } else {
    ctx.fillStyle = 'rgba(7,5,18,.92)';
    ctx.fillRect(0,0,W,H);
  }

  // Небольшая подсказка: по любому нажатию возвращаемся на стартовый экран.
  ctx.fillStyle = 'rgba(7,5,18,.56)';
  ctx.strokeStyle = 'rgba(255,240,168,.75)';
  ctx.lineWidth = 2;
  roundRect(W / 2 - 330, H - 92, 660, 54, 14); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff0a8';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('любая кнопка — на стартовый экран', W / 2, H - 58);
  ctx.textAlign = 'left';
}

function checkDayChange() {
  const day = getDayIndex();
  if (day !== lastDay) {
    lastDay = day;
    const phrases = [
      'Понедельник. Пока спокойно.',
      'Вторник. Посыпались сообщения.',
      'Среда. Начались созвоны.',
      'Четверг. Появились ASAP-задачи.',
      'Пятница. Всем внезапно стало срочно.',
    ];
    say(phrases[day], 2600);
    playSfx('nextday', 0.36);
  }
}

function update(now) {
  if (gameState !== 'play') return;
  levelTime = now - gameStartAt;
  checkDayChange();
  if (levelTime >= GAME_MS) {
    gameState = 'win';
    tasks = [];
    playSfx('like', 0.5);
    pauseOfficeAudio();
    return;
  }

  const isBurnout = now < burnoutUntil;
  const speedBoost = now < coffeeBoostUntil ? 2 : 1;
  const callSlow = now < slowdownUntil ? 0.72 : 1;
  const burnoutSlow = isBurnout ? 0.18 : 1;

  if (!isBurnout && !player.jumping && keys.ArrowUp) {
    player.vy = -28;
    player.jumping = true;
  }
  if (player.jumping) {
    player.y += player.vy;
    player.vy += 1.45;
    if (player.y >= player.baseY) {
      player.y = player.baseY;
      player.vy = 0;
      player.jumping = false;
    }
  }

  if (!isBurnout) stress = Math.max(0, stress - 0.008);

  player.dir = 'idle';
  if (keys.ArrowLeft || keys.a || keys.A) { player.x -= player.speed * speedBoost * callSlow * burnoutSlow; player.dir = 'left'; }
  if (keys.ArrowRight || keys.d || keys.D) { player.x += player.speed * speedBoost * callSlow * burnoutSlow; player.dir = 'right'; }
  player.x = Math.max(player.w / 2 - 20, Math.min(W - player.w / 2 + 20, player.x));

  if (now - lastSpawn > spawnGap) spawnTask(now);
  for (const t of tasks) t.y += t.speed;

  const netBox = { x: player.x + 22, y: player.y - 145, w: 205, h: 150 };
  for (let i = tasks.length - 1; i >= 0; i--) {
    const t = tasks[i];
    if (!t) continue;
    const hit = t.x < netBox.x + netBox.w && t.x + t.w > netBox.x && t.y < netBox.y + netBox.h && t.y + t.h > netBox.y;
    if (hit) {
      handleCatch(t, now);
      tasks.splice(i,1);
      continue;
    }
    if (t.y > H + 90) {
      if (t.type === 'task' || t.type === 'asap' || t.type === 'bigTask') {
        lives--;
        stress = Math.min(100, stress + (t.type === 'asap' ? 18 : t.type === 'bigTask' ? 24 : 12));
      }
      tasks.splice(i,1);
      if (lives <= 0) {
        gameState = 'over';
        playSfx('burnout', 0.45);
        pauseOfficeAudio();
      }
    }
  }

  if (stress >= 100 && now > burnoutUntil) {
    stress = 82;
    burnouts++;
    burnoutUntil = now + 3500;
    say('ВЫГОРАНИЕ! Телекомыч ушла пить чай', 3000);
    playSfx('burnout', 0.55);
  }
}

function maybeTelekomychReaction() {
  if (caught >= nextReactionAt) {
    const reaction = telekomychReactions[Math.floor(Math.random() * telekomychReactions.length)];
    nextReactionAt = caught + randInt(16, 24);
    say(reaction, 2600);
  }
}

function handleCatch(t, now) {
  if (t.type === 'coffee') {
    coffeeBoostUntil = now + 6000;
    score += 200;
    stress = Math.max(0, stress - 8);
    say('Выпила кофе');
    playSfx('coffee', 0.42);
  } else if (t.type === 'croissant') {
    score += 150;
    stress = Math.max(0, stress - 28);
    say('Перекусила круассаном');
    playSfx('food', 0.42);
  } else if (t.type === 'khinkali') {
    score += 150;
    stress = Math.max(0, stress - 28);
    say('Съела хинкали');
    playSfx('food', 0.42);
  } else if (t.type === 'borjomi') {
    score += 150;
    stress = Math.max(0, stress - 28);
    say('Выпила Боржоми');
    playSfx('food', 0.42);
  } else if (t.type === 'meme') {
    score += 120;
    stress = Math.max(0, stress - 14);
    say('Посмеялась с мема');
    playSfx('meme', 0.44);
  } else if (t.type === 'like') {
    score += 500;
    stress = Math.max(0, stress - 18);
    say('Получила лайк от клиента');
    playSfx('like', 0.45);
  } else if (t.type === 'dayoff') {
    score += 300;
    stress = Math.max(0, stress - 25);
    tasks = [];
    lastSpawn = now + 1800;
    say('ДЭЙ ОФФ! Все задачи исчезли', 2400);
    playSfx('dayoff', 0.48);
  } else if (t.type === 'workmsg') {
    stress = Math.min(100, stress + 22);
    score = Math.max(0, score - 100);
    messagesCaught++;
    say('Словила стресс от сообщения');
    playSfx('message', 0.45);
  } else if (t.type === 'call') {
    stress = Math.min(100, stress + 26);
    score = Math.max(0, score - 150);
    callsCaught++;
    slowdownUntil = now + 5000;
    say('Созвон! Стресс + замедление');
    playSfx('message', 0.48);
  } else if (t.type === 'asap') {
    score += getDayIndex() === 4 ? 1200 : 800;
    caught++;
    asapCaught++;
    stress = Math.min(100, stress + 13);
    say('ASAP поймана! +очки, но стресс');
    playSfx('message', 0.50);
    maybeTelekomychReaction();
  } else if (t.type === 'bigTask') {
    score += getDayIndex() === 4 ? 1800 : 1300;
    caught++;
    stress = Math.min(100, stress + 15);
    say('Большая задача закрыта!');
    playSfx('task', 0.48);
    maybeTelekomychReaction();
  } else {
    score += getDayIndex() === 4 ? 180 : 100;
    caught++;
    stress = Math.min(100, stress + 5.5);
    playSfx('task', 0.36);
    maybeTelekomychReaction();
  }
}

function draw(now) {
  drawBackground();
  tasks.filter(Boolean).forEach(drawTask);
  drawPlayer();
  drawHUD();
  if (now < coffeeBoostUntil && gameState === 'play') {
    ctx.fillStyle = '#d6ff91'; ctx.font = 'bold 26px monospace'; ctx.fillText('КОФЕ: скорость ×2', 60, 175);
  }
  if (now < slowdownUntil && gameState === 'play') {
    ctx.fillStyle = '#ff8fa7'; ctx.font = 'bold 26px monospace'; ctx.fillText('СОЗВОН: скорость ниже', 60, 210);
  }
  if (getDayIndex() === 4 && gameState === 'play') {
    ctx.fillStyle = '#fff0a8'; ctx.font = 'bold 30px monospace'; ctx.textAlign = 'center';
    ctx.fillText('ПЯТНИЦА: ВСЕМ ВНЕЗАПНО СТАЛО СРОЧНО', W/2, 222);
    ctx.textAlign = 'left';
  }
  if (now < burnoutUntil && gameState === 'play') {
    ctx.fillStyle = '#ff8fa7'; ctx.font = 'bold 38px monospace'; ctx.textAlign = 'center';
    ctx.fillText('🤯 ВЫГОРАНИЕ...', W/2, H/2 - 230);
    ctx.textAlign = 'left';
  }
  if (now < messageUntil && message) {
    ctx.fillStyle = 'rgba(14,10,30,.82)'; ctx.strokeStyle = '#b983ff'; ctx.lineWidth = 3;
    roundRect(W/2 - 380, 238, 760, 62, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 25px monospace'; ctx.textAlign = 'center';
    ctx.fillText(message, W/2, 278);
    ctx.textAlign = 'left';
  }
  if (gameState === 'start') drawOverlay('ТЕЛЕКОМЫЧ ЛОВИТ ЗАДАЧИ', 'Продержись 5 рабочих дней');
  if (gameState === 'pause') drawPauseOverlay();
  if (gameState === 'over') drawOverlay('ИГРА ОКОНЧЕНА', 'Счёт: ' + score + ' | Поймано: ' + caught);
  if (gameState === 'win') drawWinOverlay();
}

function loop(now) { update(now); draw(now); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

function pauseGame() {
  if (gameState !== 'play') return;
  gameState = 'pause';
  pausedAt = performance.now();
  playSfx('pause', 0.28);
  pauseOfficeAudio();
}

function resumeGame() {
  if (gameState !== 'pause') return;
  const pauseDuration = performance.now() - pausedAt;
  gameStartAt += pauseDuration;
  lastSpawn += pauseDuration;
  coffeeBoostUntil += pauseDuration;
  slowdownUntil += pauseDuration;
  burnoutUntil += pauseDuration;
  fridayUntil += pauseDuration;
  messageUntil += pauseDuration;
  pausedAt = 0;
  gameState = 'play';
  playOfficeAudio();
  playSfx('pause', 0.28);
}

function togglePause() {
  if (gameState === 'play') pauseGame();
  else if (gameState === 'pause') resumeGame();
}

function startGameIfNeeded() {
  if (gameState === 'win') {
    // После финальной заставки первое нажатие возвращает на стартовый экран,
    // а не запускает игру сразу заново.
    gameState = 'start';
    tasks = [];
    message = '';
    messageUntil = 0;
    pauseOfficeAudio();
    return true;
  }
  if (gameState === 'start' || gameState === 'over') {
    reset();
    return true;
  }
  return false;
}

window.addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'Spacebar'].includes(e.key)) e.preventDefault();
  if (startGameIfNeeded()) return;
  if (e.key === 'm' || e.key === 'M' || e.key === 'ь' || e.key === 'Ь') {
    toggleSound();
    return;
  }
  if (gameState === 'pause') return;
  keys[e.key] = true;
});
window.addEventListener('keyup', e => keys[e.key] = false);

function bindHold(btn, key) {
  const el = document.getElementById(btn);
  const down = e => {
    e.preventDefault();
    startGameIfNeeded();
    if (gameState === 'play') keys[key] = true;
  };
  const up = e => { e.preventDefault(); keys[key] = false; };
  el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
}
bindHold('leftBtn', 'ArrowLeft'); bindHold('rightBtn', 'ArrowRight');
document.getElementById('startBtn').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (startGameIfNeeded()) return;
  if (gameState === 'play') keys.ArrowUp = true;
});
document.getElementById('startBtn').addEventListener('pointerup', (e) => { e.preventDefault(); keys.ArrowUp = false; });
document.getElementById('startBtn').addEventListener('pointercancel', (e) => { e.preventDefault(); keys.ArrowUp = false; });

document.getElementById('pauseBtn').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (startGameIfNeeded()) return;
  if (gameState === 'play') pauseGame();
});



canvas.addEventListener('pointerdown', (e) => {
  const pos = pointerToCanvas(e);
  if (uiHit(pos, soundButton)) {
    e.preventDefault();
    toggleSound();
    return;
  }
  if (gameState === 'pause') {
    e.preventDefault();
    if (uiHit(pos, resumeButton)) resumeGame();
    return;
  }
  if (uiHit(pos, pauseButton)) {
    e.preventDefault();
    if (gameState === 'play') pauseGame();
    return;
  }
  startGameIfNeeded();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseOfficeAudio();
  else if (gameState === 'play') playOfficeAudio();
});
