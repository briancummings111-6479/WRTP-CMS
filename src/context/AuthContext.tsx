import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as AppUser, UserRole } from '../types';
import { auth, db } from '../lib/firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
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
