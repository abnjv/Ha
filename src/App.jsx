import React, { useState, useEffect, useContext } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { CSSTransition } from 'react-transition-group';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeProvider';
import { ThemeContext } from './context/ThemeContext';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { getUserNotificationsPath } from './constants';

// Component Imports
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
import CreateGroupScreen from './components/group/CreateGroupScreen';
import GroupChat from './components/group/GroupChat';
import LiveStream from './components/stream/LiveStream';
import PageTransition from './components/core/PageTransition';

// ProtectedRoute component to guard routes that require authentication
const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    // Optional: show a loading spinner while checking auth state
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

const AppContent = () => {
  const location = useLocation();
  const { themeClasses } = useContext(ThemeContext);
  const { user, db, appId } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Set up real-time listener for notifications
  useEffect(() => {
    if (user && db) {
      const notificationsPath = getUserNotificationsPath(appId, user.uid);
      const q = query(collection(db, notificationsPath), orderBy('timestamp', 'desc'));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedNotifications = [];
        querySnapshot.forEach((doc) => {
          fetchedNotifications.push({ id: doc.id, ...doc.data() });
        });
        setNotifications(fetchedNotifications);
      });

      return () => unsubscribe();
    }
  }, [user, db, appId]);

  // This will be replaced with a real "mark as read" function later
  const handleClearNotifications = () => setNotifications([]);
  const hasUnreadNotifications = notifications.some(n => !n.read);

  // This layout component can hold shared UI elements like the notification panel
  const Layout = ({ children }) => (
    <div className={`min-h-screen ${themeClasses} antialiased relative overflow-x-hidden`}>
      {children}
      {user && showNotifications && (
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

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={<PageTransition><LoginScreen /></PageTransition>} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<PageTransition><HomeScreen onToggleNotifications={() => setShowNotifications(!showNotifications)} hasNotifications={hasUnreadNotifications} /></PageTransition>} />
            <Route path="/dashboard" element={<PageTransition><MainDashboard /></PageTransition>} />
            <Route path="/create-room" element={<PageTransition><CreateRoomScreen /></PageTransition>} />
            <Route path="/room/:roomId/:roomType" element={<PageTransition><VoiceChatRoom /></PageTransition>} />
            <Route path="/private-chat-list" element={<PageTransition><PrivateChatList /></PageTransition>} />
            <Route path="/chat/:friendId/:friendName" element={<PageTransition><PrivateChat /></PageTransition>} />
            <Route path="/friends" element={<PageTransition><FriendList /></PageTransition>} />
            <Route path="/add-friend" element={<PageTransition><AddFriendScreen /></PageTransition>} />
            <Route path="/profile" element={<PageTransition><UserProfileScreen /></PageTransition>} />
            <Route path="/create-group" element={<PageTransition><CreateGroupScreen /></PageTransition>} />
            <Route path="/group-chat/:groupId" element={<PageTransition><GroupChat /></PageTransition>} />
            <Route path="/stream/start" element={<PageTransition><LiveStream /></PageTransition>} />
            <Route path="/stream/watch/:streamId" element={<PageTransition><LiveStream /></PageTransition>} />
          </Route>

          {/* Redirect any unknown paths to the home page if logged in, or login if not */}
          <Route path="*" element={<PageTransition><Navigate to="/" /></PageTransition>} />
        </Routes>
      </AnimatePresence>
    </Layout>
  );
};

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </ThemeProvider>
);

export default App;
