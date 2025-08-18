import React, { useState, useEffect, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { CSSTransition } from 'react-transition-group';

import { ThemeProvider } from './context/ThemeProvider';
import { ThemeContext } from './context/ThemeContext';

import LoginScreen from './components/auth/LoginScreen';
import HomeScreen from './components/core/HomeScreen';
import MainDashboard from './components/core/MainDashboard';
import NotificationPanel from './components/core/NotificationPanel';
import CreateRoomScreen from './components/room/CreateRoomScreen';
import VoiceChatRoom from './components/chat/VoiceChatRoom';
import PrivateChatList from './components/chat/PrivateChatList';
import PrivateChat from './components/chat/PrivateChat';
import FriendList from './components/profile/FriendList';
import AddFriendScreen from './components/profile/AddFriendScreen';
import UserProfileScreen from './components/profile/UserProfileScreen';

// ===================================================================================================================
// Firebase Configuration and Initialization
// ===================================================================================================================

let app, auth, db;
const appId = import.meta.env.VITE_APP_ID || 'default-app-id';

const initializeFirebase = () => {
  try {
    const firebaseConfigStr = import.meta.env.VITE_FIREBASE_CONFIG;
    if (!firebaseConfigStr) {
      console.error("Firebase config not found. Please set VITE_FIREBASE_CONFIG in your .env file.");
      return;
    }
    const firebaseConfig = JSON.parse(firebaseConfigStr);
    if (Object.keys(firebaseConfig).length > 0 && !app) {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      console.log('Firebase initialized in React.');
    }
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
  }
};

// ===================================================================================================================
// Mock Data (To be removed or replaced with Firestore data)
// ===================================================================================================================

const mockNotifications = [
  { id: 1, type: 'friendRequest', user: 'فاطمة', message: 'طلبت صداقتك.' },
  { id: 2, type: 'giftReceived', user: 'خالد', message: 'أرسل لك هدية 🎁.' },
  { id: 3, type: 'roomInvite', user: 'علي', message: 'دعاك للانضمام إلى غرفة "نقاشات تقنية".' },
];


// ===================================================================================================================
// Main App Component
// ===================================================================================================================

const AppContent = () => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [currentPage, setCurrentPage] = useState('login');
  const [roomId, setRoomId] = useState(null);
  const [roomType, setRoomType] = useState('large_hall');
  const [privateChatFriendId, setPrivateChatFriendId] = useState(null);
  const [privateChatFriendName, setPrivateChatFriendName] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  const { themeClasses } = useContext(ThemeContext);

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  useEffect(() => {
    initializeFirebase();
    if (auth) {
      const initialAuthToken = import.meta.env.VITE_INITIAL_AUTH_TOKEN || null;
      if (initialAuthToken) {
        signInWithCustomToken(auth, initialAuthToken).catch(error => {
          console.error("Error signing in with custom token:", error);
          signInAnonymously(auth).catch(e => console.error("Anonymous sign-in failed:", e));
        });
      } else {
        signInAnonymously(auth).catch(e => console.error("Anonymous sign-in failed:", e));
      }

      const unsubscribe = onAuthStateChanged(auth, (authUser) => {
        if (authUser) {
          setUser(authUser);
          fetchUserProfile(authUser.uid);
          setCurrentPage('home');
        } else {
          setUser(null);
          setUserProfile(null);
          setCurrentPage('login');
        }
      });
      return () => unsubscribe();
    }
  }, []);

  const fetchUserProfile = async (userId) => {
    if (!db) return;
    const userDocRef = doc(db, `/artifacts/${appId}/users/${userId}/profile`, 'data');
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      setUserProfile(docSnap.data());
    } else {
      const defaultProfile = {
        name: `مستخدم_${userId.substring(0, 4)}`,
        avatar: `https://placehold.co/128x128/${Math.floor(Math.random()*16777215).toString(16)}/FFFFFF?text=${'م'}`,
        xp: 0,
        createdAt: serverTimestamp(),
      };
      await setDoc(userDocRef, defaultProfile);
      setUserProfile(defaultProfile);
    }
  };

  const handleLogin = () => {
    setCurrentPage('home');
  };

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
    setCurrentPage('login');
  };

  const handleJoinRoom = (id, type) => {
    setRoomId(id);
    setRoomType(type);
    setCurrentPage('voice-chat-room');
  };

  const handleOpenPrivateChat = (friendId, friendName) => {
    setPrivateChatFriendId(friendId);
    setPrivateChatFriendName(friendName);
    setCurrentPage('private-chat');
  };

  const handleRemoveFriend = async (friendId) => {
    if (!db || !user) return;

    // 1. Remove friend from current user's friend list
    const userFriendRef = doc(db, `/artifacts/${appId}/users/${user.uid}/friends`, friendId);
    await deleteDoc(userFriendRef);

    // 2. Remove current user from friend's friend list
    const friendUserRef = doc(db, `/artifacts/${appId}/users/${friendId}/friends`, user.uid);
    await deleteDoc(friendUserRef);

    console.log(`Removed friend: ${friendId}`);
  };

  const hasNotifications = notifications.length > 0;

  let content;
  switch (currentPage) {
    case 'login':
      content = <LoginScreen onLogin={handleLogin} />;
      break;
    case 'home':
      content = <HomeScreen
        onGoToRooms={() => setCurrentPage('dashboard')}
        onGoToPrivateChatList={() => setCurrentPage('private-chat-list')}
        onLogout={handleLogout}
        userId={user?.uid}
        onGoToProfile={() => setCurrentPage('profile')}
        onToggleNotifications={() => setShowNotifications(!showNotifications)}
        hasNotifications={hasNotifications}
        onGoToFriendList={() => setCurrentPage('friend-list')}
      />;
      break;
    case 'dashboard':
      content = <MainDashboard
        onJoinRoom={handleJoinRoom}
        onBack={() => setCurrentPage('home')}
        userId={user?.uid}
        onCreateRoom={() => setCurrentPage('create-room')}
        db={db}
        appId={appId}
      />;
      break;
    case 'create-room':
      content = <CreateRoomScreen
        onBack={() => setCurrentPage('dashboard')}
        userId={user?.uid}
        userProfile={userProfile}
        onRoomCreated={() => setCurrentPage('dashboard')}
        db={db}
        appId={appId}
      />;
      break;
    case 'voice-chat-room':
      content = <VoiceChatRoom
        onBack={() => setCurrentPage('dashboard')}
        userId={user?.uid}
        roomId={roomId}
        userProfile={userProfile}
        setUserProfile={setUserProfile}
        roomType={roomType}
        db={db}
        appId={appId}
      />;
      break;
    case 'private-chat-list':
      content = <PrivateChatList
        onBack={() => setCurrentPage('home')}
        onOpenChat={handleOpenPrivateChat}
        userId={user?.uid}
        db={db}
        appId={appId}
      />;
      break;
    case 'private-chat':
      content = <PrivateChat
        onBack={() => setCurrentPage('private-chat-list')}
        userId={user?.uid}
        friendId={privateChatFriendId}
        friendName={privateChatFriendName}
        userProfile={userProfile}
        db={db}
        appId={appId}
      />;
      break;
    case 'friend-list':
      content = <FriendList
        onBack={() => setCurrentPage('home')}
        userId={user?.uid}
        onAddFriend={() => setCurrentPage('add-friend')}
        onRemoveFriend={handleRemoveFriend}
        db={db}
        appId={appId}
      />;
      break;
    case 'add-friend':
      content = <AddFriendScreen
        onBack={() => setCurrentPage('friend-list')}
        userId={user?.uid}
        db={db}
        appId={appId}
      />;
      break;
    case 'profile':
      content = <UserProfileScreen
        onBack={() => setCurrentPage('home')}
        userId={user?.uid}
        userProfile={userProfile}
        setUserProfile={setUserProfile}
        db={db}
        appId={appId}
      />;
      break;
    default:
      content = <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className={`min-h-screen ${themeClasses} antialiased`}>
      {content}
      {showNotifications && (
        <CSSTransition in={showNotifications} timeout={500} classNames="notification-panel">
          <NotificationPanel
            notifications={notifications}
            onClear={handleClearNotifications}
            onToggle={() => setShowNotifications(false)}
          />
        </CSSTransition>
      )}
    </div>
  );
};

const App = () => (
  <ThemeProvider>
    <AppContent />
  </ThemeProvider>
);


export default App;
