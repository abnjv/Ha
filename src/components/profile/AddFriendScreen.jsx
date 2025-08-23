import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CornerUpLeft } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { getUserProfilePath, getUserFriendsPath, getFriendRequestsPath } from '../../constants';

const AddFriendScreen = () => {
  const { t } = useTranslation();
  const { user, userProfile, db, appId } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode, themeClasses } = useContext(ThemeContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !db) return;
    setIsLoading(true);
    setMessage('');
    setSearchResults([]);

    try {
      const usersRef = collection(db, `artifacts/${appId}/users`);
      const q = query(usersRef, where('profile.data.username', '>=', searchQuery), where('profile.data.username', '<=', searchQuery + '\uf8ff'));
      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data().profile.data }))
        .filter(u => u.id !== user.uid);

      if (users.length === 0) {
        setMessage(t('noUsersFound'));
      }
      setSearchResults(users);
    } catch (error) {
      console.error("Error searching for users:", error);
      setMessage(t('errorSearching'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendFriendRequest = async (friendId) => {
    if (!db || !user) return;
    setMessage('');

    try {
      const requestRef = collection(db, getFriendRequestsPath(appId));

      // Check if a request already exists
      const q = query(requestRef, where('from', '==', user.uid), where('to', '==', friendId));
      const existingRequest = await getDocs(q);
      if (!existingRequest.empty) {
        setMessage(t('requestAlreadySent'));
        return;
      }

      await addDoc(requestRef, {
        from: user.uid,
        fromName: userProfile.name,
        fromAvatar: userProfile.avatar,
        to: friendId,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setMessage(t('friendRequestSent'));
    } catch (error) {
      console.error("Error sending friend request:", error);
      setMessage(t('errorSendingRequest'));
    }
  };

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={() => navigate('/friends')} className="p-2 rounded-full hover:bg-gray-700"><CornerUpLeft /></button>
        <span className="text-2xl font-extrabold flex-1">{t('addFriendTitle')}</span>
      </header>

      <div className="flex-1 p-8 flex flex-col items-center">
        <div className={`w-full max-w-lg p-8 rounded-3xl shadow-2xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <form onSubmit={handleSearch} className="space-y-6">
            <div>
              <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-300 mb-2">{t('searchForUsers')}</label>
              <input
                id="searchQuery"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('enterUsername')}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700"
            >
              {isLoading ? t('searching') : t('search')}
            </button>
          </form>
          {message && (
            <div className={`mt-4 p-4 rounded-xl text-center ${message.includes('Success') ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
              <p>{message}</p>
            </div>
          )}
          <div className="mt-6">
            {searchResults.map(foundUser => (
              <div key={foundUser.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-800">
                <div className="flex items-center">
                  <img src={foundUser.avatar || '/default-avatar.png'} alt={foundUser.name} className="w-10 h-10 rounded-full mr-4" />
                  <div>
                    <p className="font-bold">{foundUser.name}</p>
                    <p className="text-sm text-gray-400">@{foundUser.username}</p>
                  </div>
                </div>
                <button onClick={() => handleSendFriendRequest(foundUser.id)} className="px-4 py-2 bg-green-600 text-white rounded-full font-bold shadow-lg hover:bg-green-700">
                  {t('addFriendButton')}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddFriendScreen;
