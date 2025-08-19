import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithCustomToken, signInAnonymously, signOut } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

let app, auth, db;
const appId = import.meta.env.VITE_APP_ID || 'default-app-id';

const initializeFirebase = () => {
  if (app) return; // Already initialized
  try {
    const firebaseConfigStr = import.meta.env.VITE_FIREBASE_CONFIG;
    if (!firebaseConfigStr) {
      console.error("Firebase config not found. Please set VITE_FIREBASE_CONFIG in your .env file.");
      return;
    }
    const firebaseConfig = JSON.parse(firebaseConfigStr);
    if (Object.keys(firebaseConfig).length > 0) {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      console.log('Firebase initialized in AuthProvider.');
    }
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeFirebase();
    if (!auth) {
      setIsLoading(false);
      return;
    }

    // Sign in with token or anonymously
    const initialAuthToken = import.meta.env.VITE_INITIAL_AUTH_TOKEN || null;
    if (initialAuthToken) {
      signInWithCustomToken(auth, initialAuthToken).catch(error => {
        console.error("Error signing in with custom token:", error);
        return signInAnonymously(auth);
      }).catch(e => console.error("Anonymous sign-in failed:", e));
    } else {
      signInAnonymously(auth).catch(e => console.error("Anonymous sign-in failed:", e));
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      if (!authUser) {
        setUserProfile(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, `/artifacts/${appId}/users/${user.uid}/profile`, 'data');

      const unsubscribeProfile = onSnapshot(userDocRef, async (docSnap) => {
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
        } else {
          // Create a default profile if it doesn't exist
          const defaultProfile = {
            name: `مستخدم_${user.uid.substring(0, 4)}`,
            avatar: `https://placehold.co/128x128/${Math.floor(Math.random()*16777215).toString(16)}/FFFFFF?text=${'م'}`,
            xp: 0,
            createdAt: serverTimestamp(),
          };
          await setDoc(userDocRef, defaultProfile);
          setUserProfile(defaultProfile);
        }
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching user profile:", error);
        setIsLoading(false);
      });

      return () => unsubscribeProfile();
    }
  }, [user]);

  const sendNotification = async (targetUserId, type, message) => {
    if (!db || !userProfile) return;
    const notificationsPath = `/artifacts/${appId}/users/${targetUserId}/notifications`;
    try {
      await addDoc(collection(db, notificationsPath), {
        type,
        message,
        user: userProfile.name, // The sender's name
        read: false,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  const value = {
    user,
    userProfile,
    auth,
    db,
    appId,
    isLoading,
    logout: () => signOut(auth),
    sendNotification,
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};
