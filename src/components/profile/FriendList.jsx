import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CornerUpLeft, UserPlus, UserMinus, Check, X, Users } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import { collection, query, onSnapshot, deleteDoc, doc, where, writeBatch } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { getUserFriendsPath, getFriendRequestsPath } from '../../constants';

const FriendList = () => {
  const { t } = useTranslation();
  const { user, userProfile, db, appId, sendNotification } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode, themeClasses } = useContext(ThemeContext);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !user?.uid) return;

    const friendsQuery = query(collection(db, getUserFriendsPath(appId, user.uid)));
    const unsubscribeFriends = onSnapshot(friendsQuery, (snapshot) => {
      setFriends(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    });

    const requestsQuery = query(collection(db, getFriendRequestsPath(appId)), where('to', '==', user.uid), where('status', '==', 'pending'));
    const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
      setFriendRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeFriends();
      unsubscribeRequests();
    };
  }, [db, appId, user]);

  const handleAcceptRequest = async (requestId, fromId, fromName, fromAvatar) => {
    if (!db || !user) return;
    const batch = writeBatch(db);

    // Add to each other's friends list
    const currentUserFriendRef = doc(db, getUserFriendsPath(appId, user.uid), fromId);
    batch.set(currentUserFriendRef, { name: fromName, avatar: fromAvatar, id: fromId });

    const otherUserFriendRef = doc(db, getUserFriendsPath(appId, fromId), user.uid);
    batch.set(otherUserFriendRef, { name: userProfile.name, avatar: userProfile.avatar, id: user.uid });

    // Delete the friend request
    const requestRef = doc(db, getFriendRequestsPath(appId), requestId);
    batch.delete(requestRef);

    try {
      await batch.commit();
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  const handleRejectRequest = async (requestId) => {
    if (!db) return;
    const requestRef = doc(db, getFriendRequestsPath(appId), requestId);
    try {
      await deleteDoc(requestRef);
    } catch (error) {
      console.error("Error rejecting friend request:", error);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!db || !user) return;
    const batch = writeBatch(db);

    const currentUserFriendRef = doc(db, getUserFriendsPath(appId, user.uid), friendId);
    batch.delete(currentUserFriendRef);

    const otherUserFriendRef = doc(db, getUserFriendsPath(appId, friendId), user.uid);
    batch.delete(otherUserFriendRef);

    try {
      await batch.commit();
    } catch (error) {
      console.error("Error removing friend:", error);
    }
  };

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-gray-700"><CornerUpLeft /></button>
        <span className="text-2xl font-extrabold flex-1">{t('friends')}</span>
        <div className="flex items-center space-x-2">
            <button onClick={() => navigate('/create-group')} title={t('createGroupTitle')} className="p-2 rounded-full bg-green-600 hover:bg-green-700">
                <Users className="w-6 h-6 text-white" />
            </button>
            <button onClick={() => navigate('/add-friend')} title={t('addFriendTitle')} className="p-2 rounded-full bg-blue-600 hover:bg-blue-700">
                <UserPlus className="w-6 h-6 text-white" />
            </button>
        </div>
      </header>
      <div className="flex-1 p-8">
        {friendRequests.length > 0 && (
          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-center border-b-2 border-blue-500 pb-2">{t('friendRequests')}</h2>
            <div className="space-y-4">
              {friendRequests.map(request => (
                <div key={request.id} className={`p-4 rounded-xl shadow-md flex items-center justify-between ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="flex items-center">
                    <img src={request.fromAvatar || '/default-avatar.png'} alt={request.fromName} className="w-10 h-10 rounded-full mr-4" />
                    <span className="font-semibold">{request.fromName}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => handleAcceptRequest(request.id, request.from, request.fromName, request.fromAvatar)} className="p-2 rounded-full bg-green-600 hover:bg-green-700"><Check className="w-6 h-6 text-white" /></button>
                    <button onClick={() => handleRejectRequest(request.id)} className="p-2 rounded-full bg-red-600 hover:bg-red-700"><X className="w-6 h-6 text-white" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <h1 className="text-3xl font-bold mb-6 text-center">{t('myFriends')}</h1>
        {isLoading ? (
          <div className="flex justify-center items-center h-full"><div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-blue-500"></div></div>
        ) : friends.length > 0 ? (
          <div className="space-y-4">
            {friends.map(friend => (
              <div key={friend.id} className={`p-4 rounded-xl shadow-md flex items-center justify-between ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex items-center cursor-pointer" onClick={() => navigate(`/chat/${friend.id}/${friend.name}`)}>
                  <img src={friend.avatar || '/default-avatar.png'} alt={friend.name} className="w-10 h-10 rounded-full mr-4" />
                  <span className="font-semibold">{friend.name}</span>
                </div>
                <button onClick={() => handleRemoveFriend(friend.id)} className="p-2 rounded-full bg-red-600 hover:bg-red-700"><UserMinus className="w-6 h-6 text-white" /></button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-10">
            <p>{t('noFriends')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendList;
