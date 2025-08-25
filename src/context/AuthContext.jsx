import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithCustomToken, signInAnonymously, signOut } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp, collection, addDoc, updateDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase, ref, onValue, onDisconnect, set as rtSet, serverTimestamp as rtServerTimestamp } from "firebase/database";
import { getUserProfilePath, getUserNotificationsPath } from '../constants';
import { achievements } from '../achievements';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

let app, auth, db, storage;
const appId = import.meta.env.VITE_APP_ID || 'default-app-id';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState(null);

  useEffect(() => {
    const initializeFirebase = () => {
      try {
        if (app) return;
        const firebaseConfigStr = import.meta.env.VITE_FIREBASE_CONFIG;
        if (!firebaseConfigStr || firebaseConfigStr.trim() === '') {
          throw new Error("Firebase config (VITE_FIREBASE_CONFIG) is missing or empty in your environment variables.");
        }
        let firebaseConfig;
        try {
          firebaseConfig = JSON.parse(firebaseConfigStr);
        } catch (e) {
          console.error("Invalid JSON in VITE_FIREBASE_CONFIG:", e);
          throw new Error("Failed to parse VITE_FIREBASE_CONFIG. Please ensure it is valid JSON.");
        }
        if (Object.keys(firebaseConfig).length > 0) {
          app = initializeApp(firebaseConfig);
          auth = getAuth(app);
          db = getFirestore(app);
          storage = getStorage(app);
          console.log('Firebase initialized in AuthProvider.');
        } else {
          throw new Error("Firebase config is an empty object.");
        }
      } catch (error) {
        console.error("Failed to initialize Firebase:", error);
        setFirebaseError(error.message);
        setIsLoading(false);
      }
    };
    initializeFirebase();
    if (!auth) return;

    const initialAuthToken = import.meta.env.VITE_INITIAL_AUTH_TOKEN || null;
    if (initialAuthToken) {
      signInWithCustomToken(auth, initialAuthToken).catch(error => {
        console.error("Error signing in with custom token:", error);
        return signInAnonymously(auth);
      }).catch(err => console.error("Anonymous sign-in failed:", err));
    } else {
      signInAnonymously(auth).catch(err => console.error("Anonymous sign-in failed:", err));
    }
    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      if (!authUser) setUserProfile(null);
      setIsLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user || !db) return;

    const userDocRef = doc(db, getUserProfilePath(appId, user.uid));

    // Set status to online
    updateDoc(userDocRef, { status: 'online' }).catch(() => {}); // Fails if doc doesn't exist, which is fine

    const handleBeforeUnload = () => {
      updateDoc(userDocRef, { status: 'offline', lastSeen: serverTimestamp() });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    const unsubscribeProfile = onSnapshot(userDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      } else {
        const defaultProfile = {
          name: `مستخدم_${user.uid.substring(0, 4)}`,
          avatar: `https://placehold.co/128x128/${Math.floor(Math.random()*16777215).toString(16)}/FFFFFF?text=${'م'}`,
          xp: 0,
          bio: '',
          status: 'online',
          lastSeen: serverTimestamp(),
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

    return () => {
      unsubscribeProfile();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updateDoc(userDocRef, { status: 'offline', lastSeen: serverTimestamp() });
    };
  }, [user]);

  // Realtime Database presence system
  useEffect(() => {
    if (!user) return;
    const rtdb = getDatabase(app);
    const userStatusRef = ref(rtdb, `status/${user.uid}`);
    const isOfflineForDatabase = {
      state: 'offline',
      last_changed: rtServerTimestamp(),
    };
    const isOnlineForDatabase = {
      state: 'online',
      last_changed: rtServerTimestamp(),
    };

    const connectedRef = ref(rtdb, '.info/connected');
    onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === false) {
        return;
      }
      onDisconnect(userStatusRef).set(isOfflineForDatabase).then(() => {
        rtSet(userStatusRef, isOnlineForDatabase);
      });
    });
  }, [user]);

  const sendNotification = async (targetUserId, type, message, payload = {}) => {
    if (!db) return;
    const notificationsPath = getUserNotificationsPath(appId, targetUserId);
    try {
      await addDoc(collection(db, notificationsPath), {
        type,
        message,
        payload,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  const awardAchievement = async (achievementId) => {
    if (!user || !db || userProfile?.achievements?.[achievementId]) return;

    const userDocRef = doc(db, getUserProfilePath(appId, user.uid));
    try {
      await updateDoc(userDocRef, {
        [`achievements.${achievementId}`]: true
      });
      // Optionally, send a notification for the achievement
      sendNotification(user.uid, 'achievement_unlocked', `You've unlocked the "${achievements[achievementId].name}" achievement!`);
    } catch (error) {
      console.error(`Failed to award achievement ${achievementId}:`, error);
    }
  };

  const updateUserProfile = async (data) => {
    if (!user || !db) return;
    const userDocRef = doc(db, getUserProfilePath(appId, user.uid));
    try {
      await updateDoc(userDocRef, data, { merge: true });
    } catch (error) {
      console.error("Error updating user profile:", error);
      // Optionally re-throw or handle the error in a specific way
      throw error;
    }
  };

  const value = {
    user,
    userProfile,
    auth,
    db,
    storage,
    appId,
    isLoading,
    logout: () => signOut(auth),
    sendNotification,
    awardAchievement,
    updateUserProfile,
  };

  if (firebaseError) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#282c34', color: 'white', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ fontSize: '2rem', color: '#ff6b6b' }}>Application Error</h1>
        <p style={{ marginTop: '1rem', fontSize: '1.2rem' }}>Could not start the application due to a configuration issue.</p>
        <pre style={{ marginTop: '1rem', padding: '15px', backgroundColor: '#333', borderRadius: '5px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {firebaseError}
        </pre>
        <p style={{ marginTop: '2rem', fontSize: '1rem' }}>Please ensure you have set up your <code>.env</code> file correctly with the required environment variables.</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};
