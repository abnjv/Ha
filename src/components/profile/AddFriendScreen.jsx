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
  const [friendUserId, setFriendUserId] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendFriendRequest = async (e) => {
    e.preventDefault();
    if (!friendUserId.trim() || !db || isLoading) return;

    setIsLoading(true);
    setMessage('');

    if (friendUserId === user.uid) {
      setMessage(t('cantAddSelf')); // Example key, needs to be added
      setIsLoading(false);
      return;
    }
    // ... (rest of the logic remains the same)
  };

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={() => navigate('/friends')} className="p-2 rounded-full hover:bg-gray-700"><CornerUpLeft /></button>
        <span className="text-2xl font-extrabold flex-1">{t('addFriendTitle')}</span>
      </header>

      <div className="flex-1 p-8 flex flex-col items-center justify-center">
        <div className={`w-full max-w-lg p-8 rounded-3xl shadow-2xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <form onSubmit={handleSendFriendRequest} className="space-y-6">
            <div>
              <label htmlFor="friendUserId" className="block text-sm font-medium text-gray-300 mb-2">{t('userIdLabel')}</label>
              <input
                id="friendUserId"
                type="text"
                value={friendUserId}
                onChange={(e) => setFriendUserId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('userIdPlaceholder')}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700"
            >
              {isLoading ? t('adding') : t('addFriendButton')}
            </button>
          </form>
          {message && (
            <div className={`mt-4 p-4 rounded-xl text-center ${message.includes('Success') ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
              <p>{message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddFriendScreen;
