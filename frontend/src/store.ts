import { create } from 'zustand';
import type { Tokens, User } from './types';
interface Session {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  set: (t: Tokens) => void;
  clear: () => void;
}
// Tokens stay in memory: reloading signs out instead of exposing tokens to persistent browser storage.
export const useSession = create<Session>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  set: (t) => set(t),
  clear: () => set({ accessToken: null, refreshToken: null, user: null }),
}));
