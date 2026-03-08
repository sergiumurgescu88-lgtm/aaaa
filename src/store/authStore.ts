import { create } from 'zustand';
import { UserProfile } from '../types';
import { auth, db } from '../firebase';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,
  error: null,

  login: async () => {
    set({ loading: true, error: null });
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const newUser: UserProfile = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || 'User',
          role: 'editor',
          plan: 'free',
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        };
        await setDoc(userDocRef, newUser);
        set({ user: newUser, loading: false });
      } else {
        const userData = userDoc.data() as UserProfile;
        await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
        set({ user: userData, loading: false });
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await signOut(auth);
      set({ user: null, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  init: () => {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            set({ user: userDoc.data() as UserProfile, loading: false, initialized: true });
          } else {
            // This case handles if auth exists but firestore doc doesn't (rare)
            set({ user: null, loading: false, initialized: true });
          }
        } catch (error) {
          set({ user: null, loading: false, initialized: true });
        }
      } else {
        set({ user: null, loading: false, initialized: true });
      }
    });
  },
}));
