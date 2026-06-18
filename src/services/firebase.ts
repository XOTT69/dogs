import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, doc, getDoc, setDoc, collection, onSnapshot, addDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { PetProfile, AppEvent, Member, Household } from '../types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

enableIndexedDbPersistence(db).catch(() => {});

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, provider);
}

export function signOutUser() { return signOut(auth); }
export function onAuthChanged(cb: (user: any) => void) { return onAuthStateChanged(auth, cb); }

export async function getPetProfile(householdId: string): Promise<PetProfile | null> {
  const ref = doc(db, 'households', householdId, 'dogs', 'primary');
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() as PetProfile : null;
}

export async function savePetProfile(householdId: string, data: Partial<PetProfile>) {
  const ref = doc(db, 'households', householdId, 'dogs', 'primary');
  await setDoc(ref, data, { merge: true });
}

export function subscribeEvents(householdId: string, cb: (events: AppEvent[]) => void) {
  const q = query(collection(db, 'households', householdId, 'events'), orderBy('createdAt', 'desc'), limit(500));
  return onSnapshot(q, (snap) => {
    const items: AppEvent[] = [];
    snap.forEach((d: any) => items.push({ id: d.id, ...d.data() } as AppEvent));
    cb(items);
  });
}

export function subscribeMembers(householdId: string, cb: (members: Member[]) => void) {
  return onSnapshot(collection(db, 'households', householdId, 'members'), (snap) => {
    const items: Member[] = [];
    snap.forEach((d: any) => items.push(d.data() as Member));
    cb(items);
  });
}

export async function addEvent(householdId: string, data: Omit<AppEvent, 'id' | 'createdAt'>) {
  const ref = collection(db, 'households', householdId, 'events');
  const payload: any = { ...data, createdAt: new Date() };
  const docRef = await addDoc(ref, payload);
  return docRef.id;
}

export async function removeEvent(householdId: string, eventId: string) {
  await deleteDoc(doc(db, 'households', householdId, 'events', eventId));
}

export async function createHousehold(user: any, displayName: string): Promise<Household> {
  const id = crypto.randomUUID().slice(0, 8).toUpperCase();
  const household: Household = {
    id,
    name: displayName.split(' ')[0],
    ownerId: user.uid,
    inviteCode: id,
  };
  await setDoc(doc(db, 'households', id), { ...household, createdAt: new Date() });
  await setDoc(doc(db, 'households', id, 'members', user.uid), {
    uid: user.uid,
    email: user.email,
    displayName,
    role: 'owner',
    createdAt: new Date(),
  });
  await setDoc(doc(db, 'households', id, 'dogs', 'primary'), {
    name: '', birthDate: '', sex: 'хлопчик', breed: '', toiletMode: 'pad',
    createdAt: new Date(), updatedAt: new Date(),
  });
  return household;
}

export async function joinHousehold(user: any, inviteCode: string): Promise<Household> {
  const id = inviteCode.trim().toUpperCase();
  const hRef = doc(db, 'households', id);
  const hSnap = await getDoc(hRef);
  if (!hSnap.exists()) throw new Error('Код не знайдено');
  const data = hSnap.data() as Household;
  await setDoc(doc(db, 'households', id, 'members', user.uid), {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    role: 'member',
    createdAt: new Date(),
  });
  return data;
}

export { db as firestore };