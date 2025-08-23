import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Trash2, Bell } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import { collection, query, orderBy, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { getUserNotificationsPath } from '../../constants';

const NotificationsScreen = () => {
  const { t } = useTranslation();
  const { user, db, appId } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode, themeClasses } = useContext(ThemeContext);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user || !db) return;
    const notificationsPath = getUserNotificationsPath(appId, user.uid);
    let q;
    if (filter === 'all') {
      q = query(collection(db, notificationsPath), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, notificationsPath), where('type', '==', filter), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedNotifications = [];
      querySnapshot.forEach((doc) => {
        fetchedNotifications.push({ id: doc.id, ...doc.data() });
      });
      setNotifications(fetchedNotifications);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, db, appId, filter]);

  const getIcon = (type) => {
    // This can be refactored into a shared utility
    switch (type) {
      case 'friend_request_received': return <UserPlus className="w-8 h-8 text-blue-500" />;
      case 'friend_request_accepted': return <UserCheck className="w-8 h-8 text-green-500" />;
      case 'room_invite': return <Users className="w-8 h-8 text-purple-500" />;
      default: return <Bell className="w-8 h-8 text-gray-500" />;
    }
  }

  const handleToggleRead = async (notification) => {
    if (!user || !db) return;
    const notifRef = doc(db, getUserNotificationsPath(appId, user.uid), notification.id);
    try {
      await updateDoc(notifRef, { read: !notification.read });
    } catch (error) {
      console.error("Error toggling read status:", error);
    }
  };

  const handleDelete = async (notificationId) => {
    if (!user || !db) return;
    const notifRef = doc(db, getUserNotificationsPath(appId, user.uid), notificationId);
    try {
      await deleteDoc(notifRef);
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-gray-700"><ArrowLeft /></button>
        <span className="text-2xl font-extrabold flex-1">{t('notifications')}</span>
      </header>
      <div className="flex-1 p-8">
        <div className="flex justify-center space-x-4 mb-8">
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg font-semibold ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700'}`}>All</button>
          <button onClick={() => setFilter('friend_request_received')} className={`px-4 py-2 rounded-lg font-semibold ${filter === 'friend_request_received' ? 'bg-blue-600 text-white' : 'bg-gray-700'}`}>Friend Requests</button>
          <button onClick={() => setFilter('room_invite')} className={`px-4 py-2 rounded-lg font-semibold ${filter === 'room_invite' ? 'bg-blue-600 text-white' : 'bg-gray-700'}`}>Room Invites</button>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center h-full"><div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-blue-500"></div></div>
        ) : notifications.length > 0 ? (
          <div className="space-y-4">
            {notifications.map(notification => (
              <div key={notification.id} className={`relative flex items-center space-x-4 p-4 rounded-xl bg-gray-900 shadow-lg border ${!notification.read ? 'border-blue-500' : 'border-gray-800'}`}>
                <div className="flex-shrink-0">{getIcon(notification.type)}</div>
                <div className="flex-1">
                  <p className="text-sm text-gray-400">{notification.message}</p>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => handleToggleRead(notification)} className="p-2 rounded-full hover:bg-gray-800">
                    {notification.read ? <CheckCircle size={18} /> : <Bell size={18} />}
                  </button>
                  <button onClick={() => handleDelete(notification.id)} className="p-2 rounded-full hover:bg-gray-800">
                    <Trash2 size={18} className="text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-10">
            <Bell size={48} className="mx-auto mb-4" />
            <p>{t('noNotifications')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsScreen;
