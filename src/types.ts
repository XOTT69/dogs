export interface Member {
  uid: string;
  email: string;
  displayName: string;
  role: 'owner' | 'member';
}

export interface AppEvent {
  id: string;
  eventType: string;
  byUid?: string;
  byName?: string;
  note: string;
  timeLabel: string;
  value?: number;
  createdAt: any;
}
export interface PetProfile {
  name: string;
  birthDate: string;
  sex: 'хлопчик' | 'дівчинка';
  breed: string;
  toiletMode: 'pad' | 'outdoor' | 'transition';
}
export interface Household {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
}