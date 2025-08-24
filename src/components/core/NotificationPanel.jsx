import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { X, UserCheck, Gift, Users, CheckCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { getUserNotificationsPath } from '../../constants';

const NotificationPanel = ({ notifications, onToggle }) => {
  const { user, db, appId } = useAuth();
  const navigate = useNavigate();

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

  const handleClearAll = async () => {
    if (!user || !db || notifications.length === 0) return;
    const batch = writeBatch(db);
    notifications.forEach(notification => {
      const notifRef = doc(db, getUserNotificationsPath(appId, user.uid), notification.id);
      batch.delete(notifRef);
    });
    try {
      await batch.commit();
    } catch (error) {
      console.error("Error clearing all notifications:", error);
    }
  };

  const handleNotificationClick = (notification, e) => {
    // Stop propagation to prevent the main div's onClick from firing when clicking buttons
    e.stopPropagation();

    if (notification.type === 'friend_request_accepted' && notification.payload?.fromUserId) {
        navigate(`/private-chat/${notification.payload.fromUserId}/${notification.payload.fromUserName}`);
    } else if (notification.type === 'room_invite' && notification.payload?.roomId) {
        navigate(`/room/${notification.payload.roomId}/${notification.payload.roomType || 'voice'}`);
    }
    // Future types can be handled here
    // e.g., if (notification.type === 'new_private_message') { ... }

    if (!notification.read) {
        handleToggleRead(notification);
    }
    onToggle(); // Close panel after click
  };

  const getIcon = (type) => {
    switch (type) {
      case 'friend_request_received': return <UserCheck className="w-8 h-8 text-blue-500" />;
      case 'friend_request_accepted': return <UserCheck className="w-8 h-8 text-green-500" />;
      case 'giftReceived': return <Gift className="w-8 h-8 text-yellow-500" />;
      case 'room_invite': return <Users className="w-8 h-8 text-purple-500" />;
      case 'donation_received': return <Gift className="w-8 h-8 text-yellow-500" />;
      default: return <Gift className="w-8 h-8 text-gray-500" />;
    }
  }

  return (
    <div className={`absolute top-0 right-0 h-full w-full md:w-96 bg-gray-950/90 backdrop-blur-md p-6 flex flex-col border-l border-gray-800 transition-transform duration-500 ease-in-out transform z-50`}>
      <div className="flex justify-between items-center pb-4 border-b border-gray-800">
        <h3 className="text-xl font-extrabold text-white">الإشعارات</h3>
        <button onClick={onToggle} className="p-2 rounded-full hover:bg-gray-800 transition-colors duration-200"><X className="w-6 h-6 text-white" /></button>
      </div>
      <div className="flex-1 overflow-y-auto my-4 space-y-4 custom-scrollbar">
        {notifications.length > 0 ? (
          <TransitionGroup>
            {notifications.map((notification) => (
              <CSSTransition key={notification.id} timeout={300} classNames="notification-item">
                <div
                  onClick={(e) => handleNotificationClick(notification, e)}
                  className={`group relative flex items-center space-x-4 p-4 rounded-xl bg-gray-900 shadow-lg border transform hover:scale-105 transition-all duration-300 cursor-pointer ${!notification.read ? 'border-blue-500' : 'border-gray-800'}`}
                >
                  {!notification.read && <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping"></div>}
                  <div className="flex-shrink-0">{getIcon(notification.type)}</div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-400">{notification.message}</p>
                  </div>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); handleToggleRead(notification); }} className="p-2 rounded-full hover:bg-gray-800">
                      {notification.read ? <CheckCircle size={18} /> : <Bell size={18} />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(notification.id); }} className="p-2 rounded-full hover:bg-gray-800">
                      <Trash2 size={18} className="text-red-500" />
                    </button>
                  </div>
                </div>
              </CSSTransition>
            ))}
          </TransitionGroup>
        ) : (
          <div className="flex items-center justify-center h-full text-center text-gray-500"><p>لا توجد إشعارات جديدة.</p></div>
        )}
      </div>
      <div className="mt-4 space-y-2">
        <button onClick={() => navigate('/notifications')} className="w-full p-3 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors duration-200 shadow-md transform hover:scale-105">
          View All Notifications
        </button>
        {notifications.length > 0 && (
          <button onClick={handleClearAll} className="w-full p-3 rounded-full bg-red-600 text-white font-bold hover:bg-red-700 transition-colors duration-200 shadow-md transform hover:scale-105 flex items-center justify-center space-x-2">
            <Trash2 className="w-5 h-5"/><span>مسح الكل</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
