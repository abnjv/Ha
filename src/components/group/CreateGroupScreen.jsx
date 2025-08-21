import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CornerUpLeft, Users, Check } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { collection, query, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { getUserFriendsPath, getGroupsPath } from '../../constants';

const CreateGroupScreen = () => {
  const { t } = useTranslation();
  const { user, userProfile, db, appId } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode, themeClasses } = useContext(ThemeContext);
  const [groupName, setGroupName] = useState('');
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ... (useEffect and handlers remain the same, but error messages should be translated)

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError(t('groupNameRequired'));
      return;
    }
    if (selectedFriends.length === 0) {
        setError(t('selectOneFriend'));
        return;
    }
    // ... rest of the handler
  };

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-700"><CornerUpLeft /></button>
        <h1 className="text-2xl font-extrabold flex-1">{t('createGroupTitle')}</h1>
      </header>
      <div className="flex-1 p-8 flex flex-col items-center">
        <form onSubmit={handleCreateGroup} className={`w-full max-w-lg p-8 rounded-3xl shadow-2xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <div className="space-y-6">
            <div>
              <label htmlFor="groupName" className="block text-sm font-medium mb-2">{t('groupNameLabel')}</label>
              <input
                id="groupName"
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('groupNamePlaceholder')}
              />
            </div>
            <div>
              <h2 className="text-lg font-bold mb-2">{t('inviteFriends')}</h2>
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-2 bg-gray-800 rounded-lg">
                {friends.length > 0 ? friends.map(friend => (
                  <div key={friend.id} onClick={() => {}} className={`flex items-center p-3 rounded-lg cursor-pointer`}>
                    {/* ... friend item ... */}
                  </div>
                )) : <p className="text-gray-400 text-center">{t('noFriendsToInvite')}</p>}
              </div>
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700"
            >
              {isLoading ? t('creating') : t('createGroupButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupScreen;
