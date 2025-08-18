import React from 'react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { X, UserCheck, Gift, Users, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';

const NotificationPanel = ({ notifications, onClear, onToggle }) => {
  const { user, db, appId } = useAuth();

  const handleMarkAsRead = async (notificationId) => {
    if (!db || !user?.uid) return;
    const notificationRef = doc(db, `/artifacts/${appId}/users/${user.uid}/notifications`, notificationId);
    try {
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  return (
    <div className={`absolute top-0 right-0 h-full w-full md:w-96 bg-gray-950/90 backdrop-blur-md p-6 flex flex-col border-l border-gray-800 transition-transform duration-500 ease-in-out transform z-50`}>
      <div className="flex justify-between items-center pb-4 border-b border-gray-800">
        <h3 className="text-xl font-extrabold text-white">الإشعارات</h3>
        <button onClick={onToggle} className="p-2 rounded-full hover:bg-gray-800 transition-colors duration-200">
          <X className="w-6 h-6 text-white" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto my-4 space-y-4">
        {notifications.length > 0 ? (
          <TransitionGroup>
            {notifications.map((notification) => (
              <CSSTransition
                key={notification.id}
                timeout={300}
                classNames="notification-item"
              >
                <div className={`flex items-center space-x-4 p-4 rounded-xl bg-gray-900 shadow-lg border border-gray-800 transform hover:scale-105 transition-all duration-300 ${notification.read ? 'opacity-50' : ''}`}>
                  <div className="flex-shrink-0">
                    {notification.type === 'friendRequest' && <UserCheck className="w-8 h-8 text-green-500" />}
                    {notification.type === 'giftReceived' && <Gift className="w-8 h-8 text-yellow-500" />}
                    {notification.type === 'roomInvite' && <Users className="w-8 h-8 text-blue-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white">{notification.user}</p>
                    <p className="text-sm text-gray-400">{notification.message}</p>
                  </div>
                  <div className="flex space-x-2">
                    {!notification.read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
                        title="وضع علامة كمقروء"
                      >
                        <CheckCircle className="w-5 h-5 text-white" />
                      </button>
                    )}
                  </div>
                </div>
              </CSSTransition>
            ))}
          </TransitionGroup>
        ) : (
          <div className="flex items-center justify-center h-full text-center text-gray-500">
            <p>لا توجد إشعارات جديدة.</p>
          </div>
        )}
      </div>
      {notifications.length > 0 && (
        <button onClick={onClear} className="w-full mt-4 p-3 rounded-full bg-red-600 text-white font-bold hover:bg-red-700 transition-colors duration-200 shadow-md transform hover:scale-105">
          مسح الكل
        </button>
      )}
    </div>
  );
};

export default NotificationPanel;
