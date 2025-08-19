import React, { useState, useEffect, useContext } from 'react';
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

// Mock data for notifications, as this feature is not yet connected to backend.
const mockNotifications = [
  { id: 1, type: 'friendRequest', user: 'فاطمة', message: 'طلبت صداقتك.' },
  { id: 2, type: 'giftReceived', user: 'خالد', message: 'أرسل لك هدية 🎁.' },
  { id: 3, type: 'roomInvite', user: 'علي', message: 'دعاك للانضمام إلى غرفة "نقاشات تقنية".' },
];

const AppContent = () => {
  const { user, logout } = useAuth();
  const { themeClasses } = useContext(ThemeContext);

  const [currentPage, setCurrentPage] = useState(user ? 'home' : 'login');
  const [roomId, setRoomId] = useState(null);
  const [roomType, setRoomType] = useState('large_hall');
  const [privateChatFriendId, setPrivateChatFriendId] = useState(null);
  const [privateChatFriendName, setPrivateChatFriendName] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);

  useEffect(() => {
    // Navigate user based on auth state
    if (user && currentPage === 'login') {
      setCurrentPage('home');
    } else if (!user) {
      setCurrentPage('login');
    }
  }, [user, currentPage]);

  const handleClearNotifications = () => setNotifications([]);
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
  const handleLogout = async () => {
    await logout();
    setCurrentPage('login');
  };

  const hasNotifications = notifications.length > 0;

  let content;
  switch (currentPage) {
    case 'login':
      content = <LoginScreen onLogin={() => setCurrentPage('home')} />;
      break;
    case 'home':
      content = <HomeScreen
        onGoToRooms={() => setCurrentPage('dashboard')}
        onGoToPrivateChatList={() => setCurrentPage('private-chat-list')}
        onLogout={handleLogout}
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
        onCreateRoom={() => setCurrentPage('create-room')}
      />;
      break;
    case 'create-room':
      content = <CreateRoomScreen
        onBack={() => setCurrentPage('dashboard')}
        onRoomCreated={() => setCurrentPage('dashboard')}
      />;
      break;
    case 'voice-chat-room':
      content = <VoiceChatRoom
        onBack={() => setCurrentPage('dashboard')}
        roomId={roomId}
        roomType={roomType}
      />;
      break;
    case 'private-chat-list':
      content = <PrivateChatList
        onBack={() => setCurrentPage('home')}
        onOpenChat={handleOpenPrivateChat}
      />;
      break;
    case 'private-chat':
      content = <PrivateChat
        onBack={() => setCurrentPage('private-chat-list')}
        friendId={privateChatFriendId}
        friendName={privateChatFriendName}
      />;
      break;
    case 'friend-list':
      content = <FriendList
        onBack={() => setCurrentPage('home')}
        onAddFriend={() => setCurrentPage('add-friend')}
      />;
      break;
    case 'add-friend':
      content = <AddFriendScreen
        onBack={() => setCurrentPage('friend-list')}
      />;
      break;
    case 'profile':
      content = <UserProfileScreen
        onBack={() => setCurrentPage('home')}
      />;
      break;
    default:
      content = <LoginScreen onLogin={() => setCurrentPage('home')} />;
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </ThemeProvider>
);

export default App;
