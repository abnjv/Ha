import React, { useState, useEffect, useContext } from 'react';
import { CornerUpLeft, Edit, X, Save, Plus } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import { doc, setDoc } from 'firebase/firestore';

const getLevelFromXP = (xp) => {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

import { useAuth } from '../../context/AuthContext';

const UserProfileScreen = ({ onBack }) => {
  const { user, userProfile, db, appId } = useAuth();
  const { isDarkMode, themeClasses } = useContext(ThemeContext);
  const [isEditing, setIsEditing] = useState(false);
  const [newUserName, setNewUserName] = useState(userProfile?.name || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setNewUserName(userProfile.name);
    }
  }, [userProfile]);

  const handleSaveProfile = async () => {
    if (!db || !user?.uid || !newUserName.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const userDocRef = doc(db, `/artifacts/${appId}/users/${user.uid}/profile`, 'data');
      // The onSnapshot listener in AuthContext will handle the local state update automatically
      await setDoc(userDocRef, {
        name: newUserName,
      }, { merge: true });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating user profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const level = getLevelFromXP(userProfile?.xp || 0);
  const xpForNextLevel = (level + 1) * (level + 1) * 100 - (level * level * 100);
  const progressPercentage = (userProfile?.xp - (level * level * 100)) / xpForNextLevel * 100;

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200">
          <CornerUpLeft className="w-6 h-6" />
        </button>
        <span className="text-2xl font-extrabold flex-1">الملف الشخصي</span>
        <button onClick={() => setIsEditing(!isEditing)} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200">
          {isEditing ? <X className="w-6 h-6 text-red-500" /> : <Edit className="w-6 h-6 text-blue-500" />}
        </button>
      </header>

      <div className="flex-1 p-8 flex flex-col items-center">
        <div className={`w-full max-w-lg p-8 rounded-3xl shadow-2xl text-center ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <div className="relative w-32 h-32 mx-auto mb-4 rounded-full border-4 border-purple-500 overflow-hidden">
            <img src={userProfile?.avatar || `https://placehold.co/128x128/6B46C1/FFFFFF?text=${(userProfile?.name || 'م').charAt(0)}`} alt="Avatar" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
              <Plus className="w-8 h-8 text-white" />
            </div>
          </div>
          {isEditing ? (
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="w-full text-center text-3xl font-bold bg-gray-700 text-white rounded-xl py-2 px-4 focus:outline-none"
            />
          ) : (
            <h2 className="text-3xl font-bold mb-2">{userProfile?.name || 'مستخدم جديد'}</h2>
          )}
          <p className="text-sm text-gray-400 mb-4 break-all">ID: {userId}</p>

          {isEditing && (
            <button onClick={handleSaveProfile} disabled={isLoading} className="mt-4 py-2 px-6 bg-green-600 text-white rounded-full font-bold hover:bg-green-700 transition-colors duration-200 disabled:bg-gray-700">
              {isLoading ? 'جارٍ الحفظ...' : <Save className="w-5 h-5" />}
            </button>
          )}

          <div className="mt-8">
            <h3 className="text-lg font-bold mb-2">المستوى والخبرة</h3>
            <div className="flex items-center justify-center mb-2">
              <span className="text-4xl font-extrabold text-purple-500">{level}</span>
              <span className="text-lg font-semibold ml-2">مستوى</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
              <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
            </div>
            <p className="text-sm text-gray-400">{userProfile?.xp || 0} XP / {xpForNextLevel + (level * level * 100)} XP للمستوى التالي</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileScreen;
