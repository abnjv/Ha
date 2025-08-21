import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, Users, User as UserIcon, Home, Bell, Sun, Radio, LifeBuoy } from 'lucide-react';
import io from 'socket.io-client';
import { ThemeContext } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { collection, query, orderBy, onSnapshot, limit, where } from 'firebase/firestore';
import { getRoomsPath, getUserFriendsPath, getGroupsPath, SUPPORT_BOT_ID, SUPPORT_BOT_NAME } from '../../constants';

const HomeScreen = ({ onToggleNotifications, hasNotifications }) => {
  const { t } = useTranslation();
  const { isDarkMode, toggleDarkMode, themeClasses } = useContext(ThemeContext);
  const { user, logout, db, appId } = useAuth();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeStreams, setActiveStreams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const socketRef = useRef();

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_SIGNALING_SERVER_URL);
    socketRef.current.on('new-stream-available', (streamId) => { setActiveStreams(prev => [...prev, streamId]); });
    socketRef.current.on('stream-ended', (streamId) => { setActiveStreams(prev => prev.filter(id => id !== streamId)); });
    return () => { socketRef.current.disconnect(); };
  }, []);

  useEffect(() => {
    if (!db) return;
    const roomsQuery = query(collection(db, getRoomsPath(appId)), orderBy('createdAt', 'desc'), limit(5));
    const unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => { setRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); setIsLoading(false); });
    return () => unsubscribeRooms();
  }, [db, appId]);

  useEffect(() => {
    if (!db || !user?.uid) return;
    const friendsQuery = query(collection(db, getUserFriendsPath(appId, user.uid)), limit(5));
    const unsubscribeFriends = onSnapshot(friendsQuery, (snapshot) => { setFriends(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); });
    return () => unsubscribeFriends();
  }, [db, appId, user]);

  useEffect(() => {
    if (!db || !user?.uid) return;
    const groupsQuery = query(collection(db, getGroupsPath(appId)), where(`members.${user.uid}`, '!=', null));
    const unsubscribeGroups = onSnapshot(groupsQuery, (snapshot) => { setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); });
    return () => unsubscribeGroups();
  }, [db, appId, user]);

  const handleLogout = async () => {
    try { await logout(); } catch (error) { console.error("Logout failed:", error); }
  };

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex justify-between items-center p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="flex items-center space-x-2"><div className="p-2 bg-blue-600 rounded-full"><Home className="w-6 h-6 text-white" /></div><span className="text-2xl font-extrabold">AirChat</span></div>
        <div className="flex items-center space-x-2">
          <button onClick={() => navigate('/stream/start')} className="px-4 py-2 bg-purple-600 text-white rounded-full font-bold shadow-lg hover:bg-purple-700 flex items-center space-x-2"><Radio size={16} /><span>{t('goLive')}</span></button>
          <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-gray-700"><Sun className="w-6 h-6 text-yellow-500" /></button>
          <button onClick={() => navigate('/profile')} className="p-2 rounded-full hover:bg-gray-700" title="Profile"><UserIcon className="w-6 h-6 text-blue-500" /></button>
          <button onClick={() => navigate('/friends')} className="p-2 rounded-full hover:bg-gray-700" title="Friends"><Users className="w-6 h-6 text-pink-500" /></button>
          <button onClick={() => navigate(`/chat/${SUPPORT_BOT_ID}/${SUPPORT_BOT_NAME}`)} className="p-2 rounded-full hover:bg-gray-700" title="Help & Support"><LifeBuoy className="w-6 h-6 text-green-500" /></button>
          <button onClick={onToggleNotifications} className="p-2 rounded-full hover:bg-gray-700 relative"><Bell className="w-6 h-6 text-white" />{hasNotifications && <span className="absolute top-1 right-1 block h-2 w-2 rounded-full ring-2 ring-gray-900 bg-red-500"></span>}</button>
          <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded-full font-bold shadow-lg hover:bg-red-700"><LogOut className="w-4 h-4 inline-block ms-1" /> Logout</button>
        </div>
      </header>

      <main className="flex-1 p-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">{t('liveStreams', 'Live Streams')}</h2>
            {activeStreams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeStreams.map(streamId => (
                  <div key={streamId} onClick={() => navigate(`/stream/watch/${streamId}`)} className={`p-4 rounded-xl shadow-md flex items-center justify-between cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <div><h3 className="font-bold">Stream by {streamId.substring(0, 8)}</h3></div>
                    <button className="p-2 rounded-full bg-red-600 text-white animate-pulse">LIVE</button>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500">No active streams right now.</p>}
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-4">{t('publicRooms')}</h2>
            {isLoading ? <p>Loading rooms...</p> : (
              <div className="space-y-4">
                {rooms.map(room => (
                  <div key={room.id} onClick={() => navigate(`/room/${room.id}/${room.roomType || 'large_hall'}`)} className={`p-4 rounded-xl shadow-md flex items-center justify-between cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <div><h3 className="font-bold">{room.title}</h3><p className="text-sm text-gray-400">{room.description}</p></div>
                    <button className="p-2 rounded-full bg-green-600 text-white">Join</button>
                  </div>
                ))}
                <button onClick={() => navigate('/dashboard')} className="w-full mt-4 p-3 rounded-xl bg-gray-700 hover:bg-gray-600">{t('browseAllRooms')}</button>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">{t('myGroups')}</h2>
            {isLoading ? <p>Loading...</p> : (
              <div className="space-y-3">
                {groups.map(group => (
                  <div key={group.id} onClick={() => navigate(`/group-chat/${group.id}`)} className={`p-3 rounded-xl flex items-center space-x-3 cursor-pointer transition-all hover:bg-gray-700 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white">{group.name.charAt(0)}</div>
                    <span className="font-semibold">{group.name}</span>
                  </div>
                ))}
                 <button onClick={() => navigate('/create-group')} className="w-full mt-4 p-3 rounded-xl bg-gray-700 hover:bg-gray-600">{t('createAGroup')}</button>
              </div>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-4">{t('recentChats')}</h2>
            {isLoading ? <p>Loading...</p> : (
              <div className="space-y-3">
                {friends.map(friend => (
                  <div key={friend.id} onClick={() => navigate(`/chat/${friend.id}/${friend.name}`)} className={`p-3 rounded-xl flex items-center space-x-3 cursor-pointer transition-all hover:bg-gray-700 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                    <img src={friend.avatar} alt={friend.name} className="w-10 h-10 rounded-full" />
                    <span className="font-semibold">{friend.name}</span>
                  </div>
                ))}
                <button onClick={() => navigate('/private-chat-list')} className="w-full mt-4 p-3 rounded-xl bg-gray-700 hover:bg-gray-600">{t('allChats')}</button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomeScreen;
