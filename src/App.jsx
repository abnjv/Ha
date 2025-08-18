import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CSSTransition } from 'react-transition-group';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, ThemeContext } from './context/ThemeProvider';

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

const AppContent = () => {
  const { user } = useAuth();
  const { themeClasses } = useContext(ThemeContext);
  
  // For features not yet connected to router, like notifications panel
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [notifications, setNotifications] = React.useState([]); // Will be populated by a listener

  return (
    <div className={`min-h-screen ${themeClasses} antialiased`}>
      <Routes>
        <Route path="/login" element={!user ? <LoginScreen /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <HomeScreen onToggleNotifications={() => setShowNotifications(s => !s)} hasNotifications={notifications.length > 0} /> : <Navigate to="/login" />} />
        <Route path="/dashboard" element={user ? <MainDashboard /> : <Navigate to="/login" />} />
        <Route path="/room/create" element={user ? <CreateRoomScreen /> : <Navigate to="/login" />} />
        <Route path="/room/:roomId" element={user ? <VoiceChatRoom /> : <Navigate to="/login" />} />
        <Route path="/chats" element={user ? <PrivateChatList /> : <Navigate to="/login" />} />
        <Route path="/chat/:friendId" element={user ? <PrivateChat /> : <Navigate to="/login" />} />
        <Route path="/friends" element={user ? <FriendList /> : <Navigate to="/login" />} />
        <Route path="/friends/add" element={user ? <AddFriendScreen /> : <Navigate to="/login" />} />
        <Route path="/profile" element={user ? <UserProfileScreen /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {showNotifications && (
        <CSSTransition in={showNotifications} timeout={500} classNames="notification-panel">
          <NotificationPanel
            notifications={notifications}
            onClear={() => setNotifications([])}
            onToggle={() => setShowNotifications(false)}
          />
        </CSSTransition>
      )}
    </div>
  );
};

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
