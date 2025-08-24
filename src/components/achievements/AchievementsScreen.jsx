import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Award, Lock } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { achievements } from '../../achievements';

const AchievementsScreen = () => {
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode, themeClasses } = useContext(ThemeContext);

  const unlockedAchievements = userProfile?.achievements || {};

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={() => navigate('/profile')} className="p-2 rounded-full hover:bg-gray-700"><ArrowLeft /></button>
        <span className="text-2xl font-extrabold flex-1">{t('achievements')}</span>
      </header>
      <div className="flex-1 p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.values(achievements).map(achievement => {
            const isUnlocked = unlockedAchievements[achievement.id];
            return (
              <div key={achievement.id} className={`p-6 rounded-xl shadow-lg flex items-center space-x-4 ${isUnlocked ? (isDarkMode ? 'bg-yellow-500/20' : 'bg-yellow-100') : (isDarkMode ? 'bg-gray-800' : 'bg-gray-100')}`}>
                <div className={`p-3 rounded-full ${isUnlocked ? 'bg-yellow-500' : 'bg-gray-600'}`}>
                  {isUnlocked ? <Award className="w-8 h-8 text-white" /> : <Lock className="w-8 h-8 text-white" />}
                </div>
                <div>
                  <h3 className={`font-bold text-lg ${isUnlocked ? 'text-yellow-400' : ''}`}>{achievement.name}</h3>
                  <p className="text-sm text-gray-400">{achievement.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AchievementsScreen;
