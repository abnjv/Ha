import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, User as UserIcon, Home, Bell, Sun } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { getRoomsPath, getUserFriendsPath } from '../../constants';

const HomeScreen = ({ onToggleNotifications, hasNotifications }) => {
  const { isDarkMode, toggleDarkMode, themeClasses } = useContext(ThemeContext);
  const { user, logout, db, appId } = useAuth();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch a few public rooms
  useEffect(() => {
    if (!db) return;
    const roomsQuery = query(collection(db, getRoomsPath(appId)), orderBy('createdAt', 'desc'), limit(5));
    const unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => {
      setRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    });
    return () => unsubscribeRooms();
  }, [db, appId]);

  // Fetch friends for recent chats
  useEffect(() => {
    if (!db || !user?.uid) return;
    const friendsQuery = query(collection(db, getUserFriendsPath(appId, user.uid)), limit(10));
    const unsubscribeFriends = onSnapshot(friendsQuery, (snapshot) => {
      setFriends(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribeFriends();
  }, [db, appId, user]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex justify-between items-center p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-600 rounded-full"><Home className="w-6 h-6 text-white" /></div>
          <span className="text-2xl font-extrabold">AirChat</span>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-gray-700"><Sun className="w-6 h-6 text-yellow-500" /></button>
          <button onClick={() => navigate('/profile')} className="p-2 rounded-full hover:bg-gray-700" title="Profile"><UserIcon className="w-6 h-6 text-blue-500" /></button>
          <button onClick={() => navigate('/friends')} className="p-2 rounded-full hover:bg-gray-700" title="Friends"><Users className="w-6 h-6 text-pink-500" /></button>
          <button onClick={onToggleNotifications} className="p-2 rounded-full hover:bg-gray-700 relative">
            <Bell className="w-6 h-6 text-white" />
            {hasNotifications && <span className="absolute top-1 right-1 block h-2 w-2 rounded-full ring-2 ring-gray-900 bg-red-500"></span>}
          </button>
          <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded-full font-bold shadow-lg hover:bg-red-700"><LogOut className="w-4 h-4 inline-block ml-1" /> Logout</button>
        </div>
      </header>

      <main className="flex-1 p-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <h2 className="text-2xl font-bold mb-4">Public Rooms</h2>
          {isLoading ? <p>Loading rooms...</p> : (
            <div className="space-y-4">
              {rooms.map(room => (
                <div key={room.id} onClick={() => navigate(`/room/${room.id}/${room.roomType || 'large_hall'}`)} className={`p-4 rounded-xl shadow-md flex items-center justify-between cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div>
                    <h3 className="font-bold">{room.title}</h3>
                    <p className="text-sm text-gray-400">{room.description}</p>
                  </div>
                  <button className="p-2 rounded-full bg-green-600 text-white">Join</button>
                </div>
              ))}
              <button onClick={() => navigate('/dashboard')} className="w-full mt-4 p-3 rounded-xl bg-gray-700 hover:bg-gray-600">Browse All Rooms...</button>
            </div>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-4">Recent Chats</h2>
          {isLoading ? <p>Loading...</p> : (
            <div className="space-y-3">
              {friends.map(friend => (
                <div key={friend.id} onClick={() => navigate(`/chat/${friend.id}/${friend.name}`)} className={`p-3 rounded-xl flex items-center space-x-3 cursor-pointer transition-all hover:bg-gray-700 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                  <img src={friend.avatar} alt={friend.name} className="w-10 h-10 rounded-full" />
                  <span className="font-semibold">{friend.name}</span>
                </div>
              ))}
              <button onClick={() => navigate('/private-chat-list')} className="w-full mt-4 p-3 rounded-xl bg-gray-700 hover:bg-gray-600">All Chats...</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default HomeScreen;
