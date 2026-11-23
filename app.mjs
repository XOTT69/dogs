import {groups, goals, lessons, ratings, signals} from './lessons.mjs';
import {aloneAdvice, completed, defaults, lastWeek, lessonById, nextLesson, parseBackup, planFor, result} from './model.mjs';

const paths = {
  paw:'<circle cx="5.5" cy="9" r="2"/><circle cx="10" cy="5.5" r="2"/><circle cx="15" cy="5.5" r="2"/><circle cx="19" cy="10" r="2"/><path d="M6 18c0-3 4-7 6-7s6 4 6 7c0 2-2 3-4 2l-2-1-2 1c-2 1-4 0-4-2Z"/>',
  home:'<path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7"/>',
  plan:'<rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 5V3h6v2M9 10h6m-6 5h6"/>',
  book:'<path d="M12 6c-3-2-7-2-10-1v14c4-1 7-1 10 1 3-2 6-2 10-1V5c-3-1-7-1-10 1Zm0 0v14"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
  chart:'<path d="M4 3v17h17M8 16v-4m5 4V8m5 8V5"/>',
  user:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  spark:'<path d="m12 2 2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7Z"/>',
  walk:'<circle cx="13" cy="4" r="2"/><path d="m7 21 4-7m6 7-3-6-3-2 2-5m0 0 3 4 4 1m-7-5-4 1-4 3"/>',
  heart:'<path d="M20.5 5.5a4.8 4.8 0 0 0-6.8 0L12 7.2l-1.7-1.7a4.8 4.8 0 0 0-6.8 6.8L12 21l8.5-8.7a4.8 4.8 0 0 0 0-6.8Z"/>',
  download:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  play:'<path d="m8 4 13 8-13 8z"/>'
};
const icon = (id) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[id]}</svg>`;
const pages = {
  today:['Огляд','home'], plan:['План','plan'], library:['Вправи','book'],
  alone:['Самотність','clock'], journal:['Журнал','chart'], profile:['Профіль','user']
};
const storageKey = 'poruch-dogs-v1';
const main = document.querySelector('#main');
const dialog = document.querySelector('#dialog');
const notice = document.querySelector('#toast');
let state = defaults();
let toastTimer;
let installPrompt;
let activeLesson;
let step;
let filterGroup = '';
let filterText = '';
let clock = null;
let backupCandidate;

const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatDate = new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'long',year:'numeric'});
const dateTime = new Intl.DateTimeFormat('uk-UA',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
const weekday = new Intl.DateTimeFormat('uk-UA',{weekday:'short'});
const page = () => {
  const requested = location.hash.slice(1);
  return Object.hasOwn(pages,requested) ? requested : 'today';
};

function toast(message) {
  notice.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {notice.textContent = '';}, 5500);
}
try {
  const stored = localStorage.getItem(storageKey);
  if (stored) state = parseBackup(JSON.parse(stored));
} catch {
  toast('Збережені дані не вдалося прочитати. Можна відновити їх з резервної копії.');
}

function persist(next) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
    state = next;
    return true;
  } catch {
    toast('Не вдалося зберегти зміни. Перевірте доступ до сховища браузера.');
    return false;
  }
}

const intro = (title, subtitle) => `<div class="intro"><h1>${title}</h1><p>${subtitle}</p></div>`;
const tile = (symbol,tone='') => `<span class="tile ${tone}">${icon(symbol)}</span>`;
const action = (label,code,extra='',style='') => `<button type="button" class="button ${style}" data-action="${code}" ${extra}>${label}</button>`;
const link = (label,route,style='') => `<a class="button ${style}" href="#${route}">${label}</a>`;
const clockText = seconds => `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
const statusLabel = entry => entry.signals.length ? 'Були ознаки неспокою' : ratings[entry.rating];
const startLesson = lesson => lesson.id === 'alone' ? link('Відкрити таймер','alone','secondary') : action('Відкрити','lesson',`data-id="${lesson.id}"`,'secondary');
function card(lesson, done = completed(state.entries)) {
  const [group,symbol,tone] = groups[lesson.group];
  return `<article class="card"><div class="card-top">${tile(symbol,tone)}<span class="tag">${done.has(lesson.id) ? 'Відпрацьовано' : lesson.id === 'alone' ? 'Таймер' : `${lesson.minutes} хв`}</span></div>
    <h3>${lesson.title}</h3><p>${lesson.goal}</p><p class="tag">${group}</p>${startLesson(lesson)}</article>`;
}
function today() {
  const next = nextLesson(state.profile,state.entries);
  const plan = planFor(state.profile);
  const done = completed(state.entries);
  const recent = lastWeek(state.entries).reduce((sum,day)=>sum+day.count,0);
  const name = state.profile.name ? `План для ${esc(state.profile.name)}` : 'Тренуємося разом';
  const start = next.id === 'alone' ? link('Почати з таймером','alone','light') :
    action(`${icon('play')} Почати заняття`,'lesson',`data-id="${next.id}"`,'light');
  const suggested = [...new Set([...plan.filter(item=>item.id!==next.id && !done.has(item.id)),...plan.filter(item=>item.id!==next.id),...lessons.filter(item=>item.id!==next.id)])].slice(0,3);
  return `${intro(name,'Короткі вправи щодня у темпі вашої собаки.')}
  <section class="hero" aria-labelledby="next-title"><img class="hero-picture" src="./assets/hero.jpg" alt="">
    <div class="hero-text"><span class="eyebrow">Наступне заняття</span><h2 id="next-title">${next.title}</h2><p>${next.goal}</p>${start}</div></section>
  <div class="stats">
    <div class="stat">${tile('plan')}<div><strong>${plan.filter(item=>done.has(item.id)).length} / ${plan.length}</strong><small>Вправи за планом</small></div></div>
    <div class="stat">${tile('chart','sun')}<div><strong>${recent}</strong><small>Занять за 7 днів</small></div></div>
    <div class="stat">${tile('clock','peach')}<div><strong>${state.entries.filter(entry=>entry.lesson==='alone').length}</strong><small>Записані виходи</small></div></div>
  </div>
  <section class="section"><div class="section-head"><h2>Ваші вправи</h2><a href="#library">Усі вправи</a></div><div class="cards">${suggested.map(item=>card(item,done)).join('')}</div></section>`;
}
function plan() {
  const items = planFor(state.profile);
  const done = completed(state.entries);
  const count = items.filter(item=>done.has(item.id)).length;
  return `${intro('Персональний план','Почніть із першої невідпрацьованої вправи й повторюйте її в комфортних умовах.')}
  <section class="panel stack"><div class="row split"><h2>Ваші цілі</h2>${link('Змінити цілі','profile','secondary small')}</div>
  <div class="row">${state.profile.goals.map(id=>`<span class="tag">${goals[id][0]}</span>`).join('')}</div>
  <label>Відпрацьовано ${count} з ${items.length}<progress value="${count}" max="${items.length}"></progress></label></section>
  <div class="section cards">${items.map(item=>card(item,done)).join('')}</div>`;
}
function libraryResults() {
  const normalized = filterText.trim().toLocaleLowerCase('uk');
  const matches = lessons.filter(item => (!filterGroup || item.group===filterGroup) &&
    `${item.title} ${item.goal} ${item.steps.join(' ')}`.toLocaleLowerCase('uk').includes(normalized));
  const done = completed(state.entries);
  main.querySelector('#results').innerHTML = matches.map(item=>card(item,done)).join('') || '<p class="panel empty">За цим запитом вправ немає.</p>';
  main.querySelector('#results-count').textContent = `Знайдено вправ: ${matches.length}`;
}
function library() {
  return `${intro('Бібліотека вправ','Покрокові заняття з винагородою, критерієм успіху й простішим варіантом.')}
  <div class="row filters"><input type="search" id="search" aria-label="Пошук вправ" placeholder="Пошук за вправами" value="${esc(filterText)}">
  <select id="category" aria-label="Категорія вправ" style="width:auto;max-width:100%"><option value="">Усі категорії</option>
    ${Object.entries(groups).map(([key,[name]])=>`<option value="${key}" ${key===filterGroup?'selected':''}>${name}</option>`).join('')}</select>
  ${action('Клікер','clicker','','secondary')}</div><p id="results-count" class="muted" role="status"></p><div id="results" class="cards"></div>`;
}
function alone() {
  const advice = aloneAdvice(state.entries);
  const values = clock ?? {target:advice.seconds};
  const last = state.entries.find(item=>item.lesson==='alone');
  return `${intro('Спокій на самоті','Короткі пробні виходи, спостереження та наступний крок за результатом.')}
  <div class="columns">
    <section class="panel stack"><h2>Пробний вихід</h2><p class="callout">${advice.text}</p>
      <label>Ціль, секунд <input id="alone-target" type="number" inputmode="numeric" min="1" max="3600" required value="${values.target}" ${clock?'disabled':''}></label>
      <div class="timer" id="timer" aria-label="Час від початку">00:00</div><p class="muted" id="timer-caption">Таймер без звуку. Поверніться, щойно помітите неспокій.</p>
      <div class="row">${action('Почати відлік','start-clock',clock?'hidden':'')}${action('Зупинити','stop-clock',clock&&!clock.end?'':'hidden','danger')}${action('Записати результат','log-clock',clock?.end?'':'hidden')}${action('Відкинути відлік','reset-clock',clock?.end?'':'hidden','secondary')}${action('Ручний запис','manual-alone',clock?'hidden':'','secondary')}</div>
      ${last ? `<p class="muted">Останній вихід · ${clockText(last.seconds)} · ${statusLabel(last)}</p>` : ''}</section>
    <section class="panel stack"><h2>Перед виходом</h2><ol class="steps">${lessonById.alone.steps.map(item=>`<li>${item}</li>`).join('')}</ol>
      <p class="callout alert">Для тривалої відсутності організуйте няню або допомогу близьких. Якщо собака панікує, травмує себе або намагається втекти, припиніть спроби й зверніться до ветеринара або фахівця з поведінки.</p>
      <p>Для дому з котами завчасно перекрийте собаці доступ до лотка й перевірте, що коти вільно до нього доходять.</p>
      ${action('Вправа про котячий лоток','lesson','data-id="litter"','secondary small')}</section>
  </div>`;
}
function journal() {
  const week = lastWeek(state.entries);
  const peak = Math.max(1,...week.map(day=>day.count));
  const label = entry => `${dateTime.format(new Date(entry.at))} · ${statusLabel(entry)}${entry.seconds ? ` · ${clockText(entry.seconds)}` : ''}`;
  return `${intro('Журнал прогресу','Результати занять, спостереження і статистика за останні 7 днів.')}
  <section class="panel stack"><h2>Активність за 7 днів</h2><div class="week">${week.map(day=>`<div class="day" aria-label="${formatDate.format(day.date)}: ${day.count}"><strong>${day.count}</strong><div class="bar"><span style="height:${Math.round(day.count/peak*100)}%"></span></div><span>${weekday.format(day.date)}</span></div>`).join('')}</div></section>
  <section class="section"><div class="section-head"><h2>Усі записи <span class="tag">${state.entries.length}</span></h2>${action('Додати заняття','manual-entry','','secondary')}</div>
  ${state.entries.length ? `<ul class="list">${state.entries.map(entry=>`<li class="panel entry"><div><small>${label(entry)}</small><h3>${lessonById[entry.lesson].title}</h3>
  ${entry.signals.length?`<small>${entry.signals.map(id=>signals[id]).join(', ')}</small>`:''}${entry.note?`<p>${esc(entry.note)}</p>`:''}</div>
  ${action('Видалити','delete-entry',`data-id="${esc(entry.id)}" aria-label="Видалити запис про вправу ${lessonById[entry.lesson].title}"`,'secondary small')}</li>`).join('')}</ul>` : '<p class="panel empty">Тут з’явиться результат першого заняття. Можна пройти вправу або додати запис вручну.</p>'}</section>`;
}
function profile() {
  const {name,age,goals:chosen} = state.profile;
  return `${intro('Профіль собаки','Оберіть актуальні цілі. Порядок вправ у плані залежить від обраних цілей.')}
  <div class="columns"><form class="panel stack" id="profile-form"><label>Ім’я <input name="name" autocomplete="off" maxlength="50" placeholder="Ім’я собаки" value="${esc(name)}"></label>
    <label>Вік <input name="age" maxlength="40" placeholder="Наприклад, 8 місяців" value="${esc(age)}"></label>
    <fieldset class="choices"><legend>Цілі</legend>${Object.entries(goals).map(([id,[title]])=>`<label class="choice"><input type="checkbox" name="goals" value="${id}" ${chosen.includes(id)?'checked':''}>${title}</label>`).join('')}</fieldset>
    <div><button class="button">Зберегти профіль</button></div></form>
    <div class="stack"><section class="panel stack"><h2>Дані та встановлення</h2><p>Профіль і журнал зберігаються на цьому пристрої. Зробіть копію перед очищенням даних браузера або переходом на інший пристрій.</p>
      <div class="row">${action('Експорт','export','','secondary')}${action('Імпорт копії','import','','secondary')}<input type="file" id="import-file" accept=".json,application/json" hidden></div>
      <div>${action('Встановити PWA','install')}</div></section>
    <section class="panel stack"><h2>Підхід до тренувань</h2><p>Усі вправи ґрунтуються на винагороді. Підказки застосунку призначені для домашньої практики. Оцінити біль, паніку або ризик укусу допоможе фахівець.</p>
      <a href="https://avsab.org/resources/position-statements/" target="_blank" rel="noopener noreferrer">Рекомендації AVSAB</a>
      <a href="https://www.dogstrust.org.uk/dog-advice/training/home/time-alone" target="_blank" rel="noopener noreferrer">Поради Dogs Trust про самотність</a></section></div>
  </div>`;
}
const screens = {today,plan,library,alone,journal,profile};

function refreshClock() {
  const timer = main.querySelector('#timer');
  if (!timer || !clock) return;
  const seconds = Math.min(3600, Math.floor(((clock.end ?? Date.now())-clock.start)/1000));
  timer.textContent = clockText(Math.max(0,seconds));
  if (clock.end) main.querySelector('#timer-caption').textContent = 'Відлік зупинено. Збережіть реакцію собаки в журналі.';
  else if (seconds >= clock.target) main.querySelector('#timer-caption').textContent = 'Цільовий час минув. Поверніться та зупиніть відлік.';
}
function render(moveFocus=false) {
  const current = page();
  document.querySelector('#top-name').textContent = state.profile.name || 'Мій профіль';
  document.querySelector('#date').textContent = formatDate.format(new Date());
  document.querySelector('#nav').innerHTML = Object.entries(pages).map(([id,[title,symbol]]) =>
    `<a href="#${id}" ${id===current?'aria-current="page"':''}>${icon(symbol)}<span>${title}</span></a>`).join('');
  main.innerHTML = screens[current]();
  if (current==='library') libraryResults();
  if (current==='alone') refreshClock();
  if (moveFocus) main.focus();
}
function modal(title, content, scroll=true) {
  dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${title}</h2><button type="button" class="close" data-action="close" aria-label="Закрити">×</button></div>${content}`;
  if (!dialog.open) dialog.showModal();
  if (scroll) dialog.scrollTop = 0;
  dialog.querySelector('h2').tabIndex = -1;
  dialog.querySelector('h2').focus();
}
function showLesson(lesson, guided=false) {
  activeLesson = lesson;
  const finished = step >= lesson.steps.length;
  const instructions = !guided ? `<ol class="steps">${lesson.steps.map(text=>`<li>${text}</li>`).join('')}</ol>` :
    finished ? '<p>Виберіть, як пройшло заняття. Це оновить ваш план і журнал.</p>' :
    `<label>Крок ${step+1} з ${lesson.steps.length}<progress max="${lesson.steps.length}" value="${step+1}"></progress></label><p>${lesson.steps[step]}</p>`;
  const controls = !guided ? action('Почати вправу','guide') :
    [step>0?action('Попередній крок','prev','','secondary'):'',
      finished?action('Записати результат','lesson-result'):action(step===lesson.steps.length-1?'Завершити вправу':'Наступний крок','next')].join('');
  modal(lesson.title,`<div class="stack"><p>${lesson.goal}</p>${instructions}
    <p class="callout"><strong>Критерій успіху.</strong> ${lesson.success}</p>
    <p><strong>Як спростити.</strong> ${lesson.easier}</p>
    <div class="row">${controls}${action('Клікнути','click-sound','','secondary')}</div></div>`);
}
function entryForm(lesson, fromClock=false) {
  const isAlone = lesson?.id === 'alone';
  const seconds = fromClock ? Math.max(1,Math.min(3600,Math.round((clock.end-clock.start)/1000))) : '';
  const options = Object.entries(ratings).map(([key,label])=>`<option value="${key}">${label}</option>`).join('');
  modal(isAlone?'Записати вихід':'Записати заняття',`<form id="entry-form" class="stack" data-clock="${fromClock}">
  ${lesson ? `<input type="hidden" name="lesson" value="${lesson.id}"><p class="muted">${lesson.title}</p>` :
  `<label>Вправа<select name="lesson">${lessons.filter(item=>item.id!=='alone').map(item=>`<option value="${item.id}">${item.title}</option>`).join('')}</select></label>`}
  ${isAlone ? `<label>Фактична тривалість, секунд<input name="seconds" required type="number" min="1" max="3600" step="1" inputmode="numeric" value="${seconds}"></label>
  <fieldset class="choices"><legend>Помічені реакції</legend>${Object.entries(signals).map(([id,title])=>`<label class="choice"><input type="checkbox" name="signals" value="${id}">${title}</label>`).join('')}</fieldset>`:''}
  <label>Результат<select name="rating" required><option value="">Оберіть результат</option>${options}</select></label>
  <label>Нотатка <textarea name="note" maxlength="600" placeholder="Умови, реакція, що допомогло"></textarea></label>
  <div class="row"><button class="button">Зберегти в журналі</button>${action('Скасувати','close','','secondary')}</div></form>`);
}

let audio;
async function playClick() {
  try {
    const Engine = window.AudioContext ?? window.webkitAudioContext;
    audio ??= new Engine();
    await audio.resume();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const at = audio.currentTime;
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(1500,at);
    oscillator.frequency.exponentialRampToValueAtTime(650,at+.055);
    gain.gain.setValueAtTime(.17,at);
    gain.gain.exponentialRampToValueAtTime(.001,at+.075);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.onended = () => {oscillator.disconnect();gain.disconnect();};
    oscillator.start(at);
    oscillator.stop(at+.08);
  } catch {
    toast('Звук недоступний. Для маркера можна використати коротке «Так!».');
  }
}

function exportData() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'poruch-backup.json';
  anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function install() {
  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) {
    toast('Застосунок уже відкритий в окремому вікні.');
    return;
  }
  if (installPrompt) {
    const prompt = installPrompt;
    installPrompt = null;
    try { await prompt.prompt(); return; } catch { /* Show manual instructions. */ }
  }
  modal('Встановити Поруч',`<div class="stack"><p><strong>iPhone.</strong> Відкрийте застосунок у Safari, натисніть «Поділитися» і виберіть «На початковий екран».</p>
  <p><strong>Android або комп’ютер.</strong> У меню браузера виберіть «Встановити застосунок» або «Додати на головний екран», якщо пункт доступний.</p>
  <p>Після першого завантаження зачекайте на підготовку офлайн-режиму. Відкрийте застосунок в установленому вікні онлайн хоча б один раз.</p></div>`);
}

document.addEventListener('click',event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const {action:code,id} = button.dataset;
  switch (code) {
    case 'close': dialog.close(); break;
    case 'lesson': step=0; showLesson(lessonById[id]); break;
    case 'guide': step=0; showLesson(activeLesson,true); break;
    case 'next': step++; showLesson(activeLesson,true); break;
    case 'prev': step--; showLesson(activeLesson,true); break;
    case 'lesson-result': entryForm(activeLesson); break;
    case 'clicker': modal('Клікер',`<div class="stack"><p>Позначте потрібну дію одним кліком і одразу дайте винагороду. Починайте з комфортної гучності.</p>${action('Клікнути','click-sound')}</div>`); break;
    case 'click-sound': void playClick(); break;
    case 'start-clock': {
      const input = main.querySelector('#alone-target');
      if (!input.reportValidity()) break;
      clock = {start:Date.now(),target:input.valueAsNumber,end:null};
      render();
      main.querySelector('[data-action="stop-clock"]').focus();
      break;
    }
    case 'stop-clock': clock.end=Date.now(); render(); main.querySelector('[data-action="log-clock"]').focus(); break;
    case 'log-clock': entryForm(lessonById.alone,true); break;
    case 'reset-clock': clock=null; render(); main.querySelector('#alone-target').focus(); break;
    case 'manual-alone': entryForm(lessonById.alone); break;
    case 'manual-entry': entryForm(); break;
    case 'delete-entry':
      modal('Видалити запис?',`<div class="stack"><p>Запис і його нотатка зникнуть із журналу та статистики.</p>
      <div class="row">${action('Видалити запис','confirm-delete',`data-id="${esc(id)}"`,'danger')}${action('Скасувати','close','','secondary')}</div></div>`);
      break;
    case 'confirm-delete':
      if (persist({...state,entries:state.entries.filter(item=>item.id!==id)})) {dialog.close(); render(true); toast('Запис видалено.');}
      break;
    case 'install': void install(); break;
    case 'export': exportData(); break;
    case 'import': main.querySelector('#import-file').click(); break;
    case 'confirm-import':
      if (backupCandidate && persist(backupCandidate)) {backupCandidate=null; dialog.close(); render(true); toast('Копію відновлено.');}
      break;
  }
});

document.addEventListener('submit',event => {
  const form = event.target;
  if (!['profile-form','entry-form'].includes(form.id)) return;
  event.preventDefault();
  const fields = new FormData(form);
  if (form.id==='profile-form') {
    const chosen = fields.getAll('goals');
    if (!chosen.length) {toast('Виберіть хоча б одну ціль.'); form.querySelector('[name="goals"]').focus(); return;}
    const ordered = [...state.profile.goals.filter(id=>chosen.includes(id)),...chosen.filter(id=>!state.profile.goals.includes(id))];
    const profile = {name:fields.get('name').trim(),age:fields.get('age').trim(),goals:ordered};
    if (persist({...state,profile})) {render(true); toast('Профіль і план оновлено.');}
    return;
  }
  if (state.entries.length >= 5000) {toast('Журнал заповнено. Експортуйте копію та видаліть кілька старих записів.'); return;}
  const lesson = fields.get('lesson');
  const entry = {
    id:crypto.randomUUID(),at:new Date().toISOString(),lesson,rating:fields.get('rating'),
    note:fields.get('note').trim(),seconds:lesson==='alone'?Number(fields.get('seconds')):null,signals:fields.getAll('signals')
  };
  if (!persist({...state,entries:[entry,...state.entries]})) return;
  if (form.dataset.clock==='true') clock=null;
  dialog.close();
  render(true);
  toast(result(entry)==='easy'?'Заняття збережено. Вправу відпрацьовано.':'Результат збережено в журналі.');
});

main.addEventListener('input',event=>{
  if (event.target.id==='search') {filterText=event.target.value; libraryResults();}
});
main.addEventListener('change',async event=>{
  const input = event.target;
  if (input.id==='category') {filterGroup=input.value; libraryResults();}
  if (input.id!=='import-file') return;
  const file = input.files[0];
  input.value='';
  if (!file) return;
  try {
    if (file.size > 5_000_000) throw new Error('Файл завеликий. Оберіть резервну копію до 5 МБ.');
    backupCandidate = parseBackup(JSON.parse(await file.text()));
    modal('Відновити резервну копію?',`<div class="stack"><p>Профіль і журнал на цьому пристрої буде замінено. У копії записів: ${backupCandidate.entries.length}.</p>
    <div class="row">${action('Відновити копію','confirm-import','','danger')}${action('Скасувати','close','','secondary')}</div></div>`);
  } catch (error) {
    toast(error instanceof SyntaxError?'Файл не є коректною резервною копією JSON.':error.message);
  }
});
window.addEventListener('hashchange',()=>{
  if (location.hash === '#main') {main.focus(); return;}
  if (dialog.open) dialog.close();
  render(true);
  window.scrollTo(0,0);
});
window.addEventListener('storage',event=>{
  if (event.key!==storageKey) return;
  try {
    state=event.newValue ? parseBackup(JSON.parse(event.newValue)) : defaults();
    if (!dialog.open) render();
  } catch { toast('Не вдалося прочитати дані з іншого вікна.'); }
});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
window.addEventListener('appinstalled',()=>{installPrompt=null;toast('Поруч встановлено.');});
document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});
render();
setInterval(refreshClock,200);
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(()=>toast('Офлайн-режим недоступний у цьому браузері.'));
}
