import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Edit, X, Save, Plus, Globe, Gift, Award, Crown } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import { doc, setDoc } from 'firebase/firestore';
import DonationModal from '../donations/DonationModal';
import { getUserProfilePath } from '../../constants';
import { useAuth } from '../../context/AuthContext';

const getLevelFromXP = (xp) => {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

const UserProfileScreen = () => {
  const { t, i18n } = useTranslation();
  const { user, userProfile, db, appId, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode, themeClasses } = useContext(ThemeContext);
  const [isEditing, setIsEditing] = useState(false);
  const [newUserName, setNewUserName] = useState(userProfile?.name || '');
  const [newUserBio, setNewUserBio] = useState(userProfile?.bio || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);

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

  const plans = [
    { id: 'basic', name: 'الاشتراك الأساسي' },
    { id: 'premium', name: 'الاشتراك المتميز' },
  ];

  const getPlanName = (planId) => {
    const plan = plans.find(p => p.id === planId);
    return plan ? plan.name : 'خطة غير معروفة';
  };

  const cancelSubscription = async () => {
    if (window.confirm('هل أنت متأكد أنك تريد إلغاء اشتراكك؟')) {
      try {
        await updateUserProfile({ subscription: null });
        alert('تم إلغاء الاشتراك بنجاح.');
      } catch (error) {
        console.error('Failed to cancel subscription:', error);
        alert('فشل إلغاء الاشتراك. الرجاء المحاولة مرة أخرى.');
      }
    }
  };

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <div className="w-full max-w-md mx-auto">
        <div className="flex justify-between items-center w-full mb-4">
          <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-gray-800">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">{t('profileTitle')}</h1>
          <button onClick={() => setIsEditing(!isEditing)} className="p-2 rounded-full hover:bg-gray-700">
            {isEditing ? <X className="w-6 h-6 text-red-500" /> : <Edit className="w-6 h-6 text-blue-500" />}
          </button>
        </div>

        <div className="profile-header text-center">
          <img src={userProfile?.avatar || '/default-avatar.png'} alt="صورة الملف الشخصي" className="profile-avatar w-24 h-24 rounded-full mx-auto mb-4 border-4 border-blue-500" />
          <h2 className="text-2xl font-bold">{isEditing ? (
            <input type="text" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="bg-gray-800 text-white text-center" />
          ) : (
            userProfile?.name
          )}</h2>
          <p className="text-gray-400">@{userProfile?.username}</p>
        </div>

        <div className="profile-stats flex justify-center gap-8 my-5 p-4 bg-gray-800 rounded-xl">
          <div className="stat text-center">
            <span className="number text-2xl font-bold block">{userProfile?.friendsCount || 0}</span>
            <span className="label text-gray-400">أصدقاء</span>
          </div>
          <div className="stat text-center">
            <span className="number text-2xl font-bold block">{userProfile?.roomsCreated || 0}</span>
            <span className="label text-gray-400">غرف أنشئت</span>
          </div>
        </div>

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

        <div className="mt-6 text-start">
          <h3 className="text-lg font-bold mb-2 border-b border-gray-700 pb-1">الاشتراك</h3>
          {userProfile?.subscription && userProfile.subscription.status === 'active' ? (
            <div className="bg-gray-700 p-4 rounded-lg">
              <p className="font-bold text-lg">
                أنت مشترك في الباقة: <span className="text-blue-400">{getPlanName(userProfile.subscription.planId)}</span>
              </p>
              <p className="text-sm text-gray-400">
                تاريخ الاشتراك: {new Date(userProfile.subscription.subscribedAt).toLocaleDateString()}
              </p>
              <button
                onClick={cancelSubscription}
                className="w-full mt-4 p-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
              >
                إلغاء الاشتراك
              </button>
            </div>
          ) : (
            <p className="text-gray-400">أنت غير مشترك حاليًا.</p>
          )}
        </div>

        {isEditing && (
          <button onClick={handleSaveProfile} className="w-full mt-4 p-3 rounded-xl bg-green-600 hover:bg-green-700">
            <Save className="inline-block mr-2" />
            {t('saveChanges', 'Save Changes')}
          </button>
        )}

        {!isEditing && (
          <button onClick={() => alert('Friend request sent!')} className="friend-btn w-full py-3 px-6 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition duration-300 mt-4">
            <Plus className="inline-block mr-2" />
            إضافة صديق
          </button>
        )}

      <button onClick={() => navigate('/achievements')} className="w-full py-3 px-6 bg-purple-600 text-white font-bold rounded-xl shadow-lg hover:bg-purple-700 transition duration-300 mt-4">
        <Award className="inline-block mr-2" />
        Achievements
      </button>

      <button onClick={() => navigate('/subscriptions')} className="w-full py-3 px-6 bg-teal-600 text-white font-bold rounded-xl shadow-lg hover:bg-teal-700 transition duration-300 mt-4">
        <Crown className="inline-block mr-2" />
        الاشتراكات
      </button>

      {!isEditing && user.uid !== userProfile.id && (
        <button onClick={() => setIsDonationModalOpen(true)} className="w-full py-3 px-6 bg-yellow-500 text-black font-bold rounded-xl shadow-lg hover:bg-yellow-600 transition duration-300 mt-4">
          <Gift className="inline-block mr-2" />
          Donate XP
        </button>
      )}

      <DonationModal
        isOpen={isDonationModalOpen}
        onClose={() => setIsDonationModalOpen(false)}
        recipient={userProfile}
      />

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
  );
};

export default UserProfileScreen;
