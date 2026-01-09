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
import { doc, getDoc, setDoc, query, where, collection, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
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
      console.log("AuthContext: onAuthStateChanged triggered", firebaseUser ? firebaseUser.uid : "No user");
      try {
        if (firebaseUser) {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          const email = firebaseUser.email || '';
          console.log(`AuthContext: Checking user doc for ${firebaseUser.uid} (email: ${email}). Exists: ${userDocSnap.exists()}`);

          // Check if this user is in our pre-defined staff list (for initial bootstrap only)
          const staffConfig = STAFF_ROLES.find(s => s.email.toLowerCase() === email.toLowerCase());

          let appUser: AppUser;

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            console.log("DEBUG_V2: User found in Firestore. Role in DB:", userData.role, "Title in DB:", userData.title);

            // Check if we need to update the user's role/title based on config (Bootstrap/Override)
            // This ensures that if we change roles in staff.ts, they propagate to Firestore on next login
            /* DISABLED: This prevents manual role changes from persisting.
            if (staffConfig && (userData.role !== staffConfig.role || userData.title !== staffConfig.title)) {
              console.log("AuthContext: Updating staff role/title from config");
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
            */
            // Use Firestore data as the source of truth
            appUser = {
              uid: firebaseUser.uid,
              name: userData.name || firebaseUser.displayName || 'Unknown User',
              email: email,
              role: userData.role as UserRole || 'viewer',
              title: userData.title
            };
            // }
          } else {
            console.log("AuthContext: User doc not found. Checking for legacy record...");
            // User document does not exist for this UID.
            // Check if there is a legacy user record with the same email but different ID.
            const q = query(collection(db, 'users'), where('email', '==', email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              // Found a legacy record! Migrate it.
              const legacyDoc = querySnapshot.docs[0];
              const legacyData = legacyDoc.data();
              const legacyId = legacyDoc.id;
              console.log(`AuthContext: Found legacy user record ${legacyId} for email ${email}. Migrating to ${firebaseUser.uid}.`);

              // Helper to migrate collection
              const migrateCollection = async (collectionName: string, field: string) => {
                const q = query(collection(db, collectionName), where(field, '==', legacyId));
                const snapshot = await getDocs(q);
                console.log(`AuthContext: Migrating ${snapshot.size} documents in ${collectionName} (field: ${field})`);
                const updates = snapshot.docs.map(doc => updateDoc(doc.ref, { [field]: firebaseUser.uid }));
                await Promise.all(updates);
              };

              try {
                await Promise.all([
                  migrateCollection('clients', 'metadata.assignedAdminId'),
                  migrateCollection('clients', 'metadata.createdBy'),
                  migrateCollection('clients', 'metadata.lastModifiedBy'),
                  migrateCollection('tasks', 'assignedToId'),
                  migrateCollection('caseNotes', 'staffId'),
                  migrateCollection('workshops', 'assignedToId')
                ]);
                console.log("AuthContext: Data migration completed.");
              } catch (err) {
                console.error("AuthContext: Data migration failed", err);
              }
              // We continue to create the new user even if migration fails partially

              // Use legacy data, but prefer legacy DB value over config
              const roleToUse = (legacyData.role || staffConfig?.role) as UserRole || 'viewer';
              const titleToUse = legacyData.title || staffConfig?.title;
              console.log(`DEBUG_V2: Legacy Migration. Using Role: ${roleToUse} (Legacy: ${legacyData.role}, Config: ${staffConfig?.role})`);

              appUser = {
                uid: firebaseUser.uid,
                name: legacyData.name || firebaseUser.displayName || staffConfig?.name || 'Unknown User',
                email: email,
                role: roleToUse,
                title: titleToUse
              };

              // Create new doc with correct UID
              console.log("AuthContext: Creating new user doc", appUser);
              await setDoc(userDocRef, {
                ...legacyData, // Keep other fields like createdAt if they exist
                name: appUser.name,
                email: appUser.email,
                role: appUser.role,
                title: appUser.title || null,
                migratedFrom: legacyDoc.id, // Audit trail
                migratedAt: Date.now()
              });

              // Delete the old duplicate record
              try {
                console.log("AuthContext: Deleting legacy doc", legacyId);
                await deleteDoc(doc(db, 'users', legacyDoc.id));
              } catch (deleteErr) {
                console.error("AuthContext: Failed to delete legacy doc", deleteErr);
                // Do not block login if deletion fails
              }

            } else {
              console.log("AuthContext: No legacy record found. Creating new user.");
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
          }
          console.log("AuthContext: User set successfully", appUser);
          setUser(appUser);
        } else {
          console.log("AuthContext: No user");
          setUser(null);
        }
      } catch (error) {
        console.error("AuthContext: Error in onAuthStateChanged", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
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
