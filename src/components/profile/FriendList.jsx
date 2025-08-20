import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerUpLeft, UserPlus, UserMinus, Check, X } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import { collection, query, onSnapshot, deleteDoc, doc, where, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { getUserFriendsPath, getFriendRequestsPath, getUserProfilePath } from '../../constants';

const FriendList = () => {
  const { user, userProfile, db, appId, sendNotification } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode, themeClasses } = useContext(ThemeContext);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Effect for fetching friends
  useEffect(() => {
    if (!db || !user?.uid) return;
    const friendsPath = getUserFriendsPath(appId, user.uid);
    const friendsCollectionRef = collection(db, friendsPath);
    const q = query(friendsCollectionRef);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedFriends = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFriends(fetchedFriends);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching friends:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, db, appId]);

  // Effect for fetching friend requests
  useEffect(() => {
    if (!db || !user?.uid) return;
    const requestsRef = collection(db, getFriendRequestsPath(appId));
    const q = query(requestsRef, where("to", "==", user.uid), where("status", "==", "pending"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedRequests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFriendRequests(fetchedRequests);
    });

    return () => unsubscribe();
  }, [user, db, appId]);

  const handleAcceptRequest = async (request) => {
    if (!db || !user || !userProfile || !sendNotification) return;
    const batch = writeBatch(db);

    const userFriendRef = doc(db, getUserFriendsPath(appId, user.uid), request.from);
    batch.set(userFriendRef, { name: request.fromName, avatar: request.fromAvatar, addedAt: new Date() });

    const friendUserRef = doc(db, getUserFriendsPath(appId, request.from), user.uid);
    batch.set(friendUserRef, { name: userProfile.name, avatar: userProfile.avatar, addedAt: new Date() });

    const requestRef = doc(db, getFriendRequestsPath(appId), request.id);
    batch.delete(requestRef);

    try {
      await batch.commit();
      console.log("Friend request accepted.");

      await sendNotification(
        request.from,
        'friend_request_accepted',
        `وافق ${userProfile.name} على طلب صداقتك.`,
        { fromUserId: user.uid, fromUserName: userProfile.name }
      );
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  const handleDeclineRequest = async (requestId) => {
    if (!db) return;
    const requestRef = doc(db, getFriendRequestsPath(appId), requestId);
    try {
      await deleteDoc(requestRef);
      console.log("Friend request declined.");
    } catch (error) {
      console.error("Error declining friend request:", error);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!db || !user) return;
    const batch = writeBatch(db);

    const userFriendRef = doc(db, getUserFriendsPath(appId, user.uid), friendId);
    batch.delete(userFriendRef);

    const friendUserRef = doc(db, getUserFriendsPath(appId, friendId), user.uid);
    batch.delete(friendUserRef);

    try {
        await batch.commit();
        console.log(`Removed friend: ${friendId}`);
    } catch (error) {
        console.error("Error removing friend:", error);
    }
  };

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200">
          <CornerUpLeft className="w-6 h-6" />
        </button>
        <span className="text-2xl font-extrabold flex-1">الأصدقاء</span>
        <button onClick={() => navigate('/add-friend')} className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors duration-200">
          <UserPlus className="w-6 h-6 text-white" />
        </button>
      </header>
      <div className="flex-1 p-8">
        {friendRequests.length > 0 && (
          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-center border-b-2 border-blue-500 pb-2">طلبات الصداقة</h2>
            <div className="space-y-4">
              {friendRequests.map(request => (
                <div key={request.id} className={`flex items-center p-4 rounded-2xl shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <div className="flex-1 flex items-center space-x-4 space-x-reverse">
                    <img src={request.fromAvatar} alt={request.fromName} className="w-12 h-12 rounded-full object-cover" />
                    <span className="font-bold">{request.fromName}</span>
                  </div>
                  <div className="flex space-x-2 space-x-reverse">
                    <button onClick={() => handleAcceptRequest(request)} className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700"><Check /></button>
                    <button onClick={() => handleDeclineRequest(request.id)} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"><X /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <h1 className="text-3xl font-bold mb-6 text-center">أصدقائي</h1>
        {isLoading ? (
          <div className="flex justify-center items-center h-full"><div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-blue-500"></div></div>
        ) : friends.length > 0 ? (
          <div className="space-y-4">
            {friends.map(friend => (
              <div key={friend.id} className={`flex items-center p-4 rounded-2xl shadow-md transition-colors duration-200 ${isDarkMode ? 'bg-gray-900 hover:bg-gray-800' : 'bg-white hover:bg-gray-100'}`}>
                <div className="flex-1 flex items-center space-x-4 space-x-reverse cursor-pointer" onClick={() => navigate(`/private-chat/${friend.id}/${friend.name}`)}>
                  <img src={friend.avatar} alt={friend.name} className="w-12 h-12 rounded-full object-cover" />
                  <span className="font-bold">{friend.name}</span>
                </div>
                <button onClick={() => handleRemoveFriend(friend.id)} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"><UserMinus /></button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-10"><p>ليس لديك أصدقاء بعد. أضف بعض الأصدقاء لبدء الدردشة!</p></div>
        )}
      </div>
    </div>
  );
};

export default FriendList;
