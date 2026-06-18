export type Courses = any[];
export type Knowledge = any[];
export type Protocols = any[];
export type SocialItems = any[];
export type Tips = any[];
export type Breeds = any[];

let courses: Courses | null = null;
let knowledge: Knowledge | null = null;
let protocols: Protocols | null = null;
let social: SocialItems | null = null;
let tips: Tips | null = null;
let breeds: Breeds | null = null;

export function initContentLoader() {
  if (typeof window === 'undefined') return;
  // Static JSON imports will be bundled by Vite
}

export function getCourses(): Courses {
  if (!courses) {
    // @ts-ignore
    courses = window.COURSES || [];
  }
  return courses || [];
}

export function getKnowledge(): Knowledge {
  if (!knowledge) {
    // @ts-ignore
    knowledge = window.KNOWLEDGE || [];
  }
  return knowledge || [];
}

export function getProtocols(): Protocols {
  if (!protocols) {
    // @ts-ignore
    protocols = window.PROBLEM_PROTOCOLS || [];
  }
  return protocols || [];
}

export function getSocial(): SocialItems {
  if (!social) {
    // @ts-ignore
    social = window.SOCIAL_ITEMS || [];
  }
  return social || [];
}

export function getTips(): Tips {
  if (!tips) {
    // @ts-ignore
    tips = window.DAILY_TIPS || [];
  }
  return tips || [];
}

export function getBreeds(): Breeds {
  if (!breeds) {
    // @ts-ignore
    breeds = window.BREED_PROFILES || [];
  }
  return breeds || [];
}
