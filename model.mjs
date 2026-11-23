import {goals, lessons, ratings, signals} from './lessons.mjs';

export const lessonById = Object.fromEntries(lessons.map(item => [item.id,item]));
export const defaults = () => ({version:1, profile:{name:'', age:'', goals:['basic','alone']}, entries:[]});
export const planFor = (profile) => [...new Set(profile.goals.flatMap(id => goals[id][1]))].map(id => lessonById[id]);
export const result = entry => entry.signals.length ? 'hard' : entry.rating;
export const completed = entries => new Set(entries.filter(entry => result(entry) === 'easy').map(entry => entry.lesson));
export const nextLesson = (profile, entries) => {
  const plan = planFor(profile);
  const done = completed(entries);
  return plan.find(lesson => !done.has(lesson.id)) ?? plan[0];
};
export const dayKey = (date = new Date()) => [date.getFullYear(),date.getMonth()+1,date.getDate()].join('-');

export function lastWeek(entries, now = new Date()) {
  const days = new Map();
  for (const entry of entries) {
    const key = dayKey(new Date(entry.at));
    days.set(key, (days.get(key) ?? 0) + 1);
  }
  return Array.from({length:7}, (_,i) => {
    const date = new Date(now.getFullYear(),now.getMonth(),now.getDate()+i-6);
    return {date, count:days.get(dayKey(date)) ?? 0};
  });
}

export function aloneAdvice(entries) {
  const last = entries.find(entry => entry.lesson === 'alone');
  const initial = {seconds:2, text:'Почніть з 1–2 секунд, якщо собака спокійна біля дверей. За напруження спробуйте тільки рух до дверей.'};
  if (!last) return initial;
  const seconds = last.seconds ?? initial.seconds;
  if (result(last) === 'unknown') {
    return {seconds:Math.min(seconds, 2), text:'Спершу організуйте спостереження. Повторіть дуже коротку спробу з камерою або потренуйте рух до дверей.'};
  }
  if (result(last) !== 'easy') {
    return {seconds:Math.max(1,Math.floor(seconds/2)), text:'Наступного разу спробуйте коротший вихід. Якщо напруження починається ще до виходу, попрацюйте з рухом до дверей.'};
  }
  return {seconds:Math.max(1,seconds), text:'Повторіть спокійний час у подібних умовах. Після кількох спокійних повторів можна вручну додати трохи часу.'};
}

const isText = (value,limit) => typeof value === 'string' && value.length <= limit;
const known = (obj,key) => typeof key === 'string' && Object.hasOwn(obj,key);

export function parseBackup(raw) {
  if (raw?.version !== 1 || !raw.profile || !Array.isArray(raw.entries) || raw.entries.length > 5000) {
    throw new Error('Цей файл має невідомий формат або містить понад 5 000 записів.');
  }
  const {name, age, goals: chosen} = raw.profile;
  if (!isText(name,50) || !isText(age,40) || !Array.isArray(chosen) || !chosen.length || !chosen.every(key => known(goals,key))) {
    throw new Error('У файлі некоректний профіль або цілі.');
  }
  const ids = new Set();
  const entries = raw.entries.map(entry => {
    if (!entry || !isText(entry.id,80) || !entry.id || ids.has(entry.id) ||
        !known(lessonById,entry.lesson) || !known(ratings,entry.rating) ||
        !isText(entry.at,40) || !Number.isFinite(Date.parse(entry.at)) ||
        !isText(entry.note,600) || !Array.isArray(entry.signals) ||
        !entry.signals.every(key => known(signals,key)) ||
        (entry.lesson === 'alone'
          ? !Number.isInteger(entry.seconds) || entry.seconds < 1 || entry.seconds > 3600
          : entry.seconds !== null || entry.signals.length)) {
      throw new Error('У файлі є некоректний або дубльований запис.');
    }
    ids.add(entry.id);
    const {id,lesson,rating,at,note,seconds,signals: observed} = entry;
    return {id,lesson,rating,at:new Date(at).toISOString(),note,seconds,signals:[...new Set(observed)]};
  });
  entries.sort((a,b) => Date.parse(b.at)-Date.parse(a.at));
  return {version:1,profile:{name, age, goals:[...new Set(chosen)]},entries};
}
