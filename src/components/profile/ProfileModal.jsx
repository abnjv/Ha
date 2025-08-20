import React, { useState, useEffect, useContext } from 'react';
import { X } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import { getUserProfilePath } from '../../constants';

const ProfileModal = ({ userId, onClose }) => {
  const { db, appId } = useAuth();
  const { isDarkMode, themeClasses } = useContext(ThemeContext);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !userId) return;

    const profileDocRef = doc(db, getUserProfilePath(appId, userId));
    const unsubscribe = onSnapshot(profileDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      } else {
        console.log("No such profile!");
        setProfile(null);
      }
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching profile:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db, appId, userId]);

  if (!profile && !isLoading) {
    return null; // Or some fallback UI
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50" onClick={onClose}>
      <div className={`rounded-3xl shadow-2xl w-full max-w-sm m-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
        {isLoading ? (
          <div className="p-8 text-center">Loading profile...</div>
        ) : (
          <div className="p-8 text-center">
            <div className="relative">
              <button onClick={onClose} className="absolute top-0 right-0 p-2 rounded-full hover:bg-gray-700">
                <X />
              </button>
            </div>
            <img src={profile?.avatar} alt="Avatar" className="w-32 h-32 mx-auto mb-4 rounded-full border-4 border-purple-500" />
            <h2 className="text-3xl font-bold mb-2">{profile?.name}</h2>

            <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse mb-4">
              <span className={`h-3 w-3 rounded-full ${profile?.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
              <p className="text-sm text-gray-400">
                {profile?.status === 'online'
                  ? 'متصل'
                  : `غير متصل ${profile?.lastSeen ? `- آخر ظهور ${new Date(profile.lastSeen.toDate()).toLocaleString()}` : ''}`
                }
              </p>
            </div>

            <div className="mt-4 text-left">
                <h3 className="text-lg font-bold mb-2 border-b border-gray-700 pb-1">نبذة تعريفية</h3>
                <p className="text-sm text-gray-400 italic">{profile?.bio || 'No bio yet.'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
