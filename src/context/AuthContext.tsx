import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as AppUser, UserRole } from '../types';
import { auth, db } from '../lib/firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { STAFF_ROLES } from '../config/staff';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        const email = firebaseUser.email || '';

        // Check if this user is in our pre-defined staff list (for initial bootstrap only)
        const staffConfig = STAFF_ROLES.find(s => s.email.toLowerCase() === email.toLowerCase());

        let appUser: AppUser;

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();

          // Check if we need to update the user's role/title based on config (Bootstrap/Override)
          // This ensures that if we change roles in staff.ts, they propagate to Firestore on next login
          if (staffConfig && (userData.role !== staffConfig.role || userData.title !== staffConfig.title)) {
            await setDoc(userDocRef, {
              ...userData,
              role: staffConfig.role,
              title: staffConfig.title
            }, { merge: true });

            appUser = {
              uid: firebaseUser.uid,
              name: userData.name || firebaseUser.displayName || 'Unknown User',
              email: email,
              role: staffConfig.role as UserRole,
              title: staffConfig.title
            };
          } else {
            // Use Firestore data as the source of truth
            appUser = {
              uid: firebaseUser.uid,
              name: userData.name || firebaseUser.displayName || 'Unknown User',
              email: email,
              role: userData.role as UserRole || 'viewer',
              title: userData.title
            };
          }
        } else {
          // New user - check staff config for bootstrap, otherwise default to viewer/pending
          appUser = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || staffConfig?.name || 'Unknown User',
            email: email,
            role: (staffConfig?.role as UserRole) || 'viewer',
            title: staffConfig?.title
          };

          await setDoc(userDocRef, {
            name: appUser.name,
            email: appUser.email,
            role: appUser.role,
            title: appUser.title || null,
            createdAt: Date.now()
          });
        }
        console.log("AuthContext: User set", appUser);
        setUser(appUser);
      } else {
        console.log("AuthContext: No user");
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error signing in with email/password", error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Check if this user is in our pre-defined staff list
      const staffConfig = STAFF_ROLES.find(s => s.email.toLowerCase() === email.toLowerCase());

      // Determine initial role: 'admin' if in staff list, otherwise 'pending'
      const initialRole: UserRole = staffConfig ? (staffConfig.role as UserRole) : 'pending';
      const initialTitle = staffConfig?.title || 'Applicant';

      // Create user document in Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        name: name,
        email: email,
        role: initialRole,
        title: initialTitle,
        createdAt: Date.now()
      });

      // Update local state immediately to reflect new user
      setUser({
        uid: firebaseUser.uid,
        name: name,
        email: email,
        role: initialRole,
        title: initialTitle
      });

    } catch (error) {
      console.error("Error signing up", error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Error sending password reset email", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, loginWithEmail, signup, resetPassword, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
