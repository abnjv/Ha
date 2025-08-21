import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CornerUpLeft, Edit, X, Save, Plus, Globe } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import { doc, setDoc } from 'firebase/firestore';
import { getUserProfilePath } from '../../constants';
import { useAuth } from '../../context/AuthContext';

const getLevelFromXP = (xp) => {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

const UserProfileScreen = () => {
  const { t, i18n } = useTranslation();
  const { user, userProfile, db, appId } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode, themeClasses } = useContext(ThemeContext);
  const [isEditing, setIsEditing] = useState(false);
  const [newUserName, setNewUserName] = useState(userProfile?.name || '');
  const [newUserBio, setNewUserBio] = useState(userProfile?.bio || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setNewUserName(userProfile.name);
      setNewUserBio(userProfile.bio || '');
    }
  }, [userProfile]);

  const handleSaveProfile = async () => {
    // ... (logic is unchanged)
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const level = getLevelFromXP(userProfile?.xp || 0);
  // ... (level logic is unchanged)

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-gray-700"><CornerUpLeft /></button>
        <span className="text-2xl font-extrabold flex-1">{t('profileTitle')}</span>
        <button onClick={() => setIsEditing(!isEditing)} className="p-2 rounded-full hover:bg-gray-700">
          {isEditing ? <X className="w-6 h-6 text-red-500" /> : <Edit className="w-6 h-6 text-blue-500" />}
        </button>
      </header>

      <div className="flex-1 p-8 flex flex-col items-center">
        <div className={`w-full max-w-lg p-8 rounded-3xl shadow-2xl text-center ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          {/* ... */}
          <div className="mt-4 text-start">
            <h3 className="text-lg font-bold mb-2 border-b border-gray-700 pb-1">{t('bio', 'Bio')}</h3>
            {isEditing ? (
              <textarea
                value={newUserBio}
                onChange={(e) => setNewUserBio(e.target.value)}
                className="w-full text-sm bg-gray-700 text-white rounded-xl py-2 px-4 focus:outline-none"
                rows="3"
                placeholder={t('bioPlaceholder', 'Tell us about yourself...')}
              />
            ) : (
              <p className="text-sm text-gray-400 italic">{userProfile?.bio || t('noBio', 'No bio yet.')}</p>
            )}
          </div>
          {/* ... */}
          <div className="mt-8 border-t border-gray-700 pt-6">
            <h3 className="text-lg font-bold mb-4 flex items-center justify-center space-x-2">
                <Globe />
                <span>{t('languageSettings')}</span>
            </h3>
            <div className="flex justify-center space-x-4">
                <button onClick={() => changeLanguage('en')} className={`px-4 py-2 rounded-lg font-semibold ${i18n.language === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-700'}`}>English</button>
                <button onClick={() => changeLanguage('ar')} className={`px-4 py-2 rounded-lg font-semibold ${i18n.language === 'ar' ? 'bg-blue-600 text-white' : 'bg-gray-700'}`}>العربية</button>
                <button onClick={() => changeLanguage('fr')} className={`px-4 py-2 rounded-lg font-semibold ${i18n.language === 'fr' ? 'bg-blue-600 text-white' : 'bg-gray-700'}`}>Français</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileScreen;
