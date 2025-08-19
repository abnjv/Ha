import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerUpLeft } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

const AddFriendScreen = () => {
  const { user, db, appId } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode, themeClasses } = useContext(ThemeContext);
  const [friendUserId, setFriendUserId] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddFriend = async (e) => {
    e.preventDefault();
    if (!friendUserId.trim() || !db || isLoading) return;

    setIsLoading(true);
    setMessage('');

    if (friendUserId === user.uid) {
      setMessage('لا يمكنك إضافة نفسك كصديق.');
      setIsLoading(false);
      return;
    }

    try {
      // Check if friend exists (optional but good practice)
      const friendProfileRef = doc(db, `/artifacts/${appId}/users/${friendUserId}/profile`, 'data');
      const docSnap = await getDoc(friendProfileRef);

      if (!docSnap.exists()) {
        setMessage('لم يتم العثور على مستخدم بهذا المعرف.');
        setIsLoading(false);
        return;
      }

      // Add to current user's friend list
      const userFriendDocRef = doc(db, `/artifacts/${appId}/users/${user.uid}/friends`, friendUserId);
      await setDoc(userFriendDocRef, {
        name: docSnap.data().name || 'مجهول',
        avatar: docSnap.data().avatar || `https://placehold.co/48x48/${Math.floor(Math.random()*16777215).toString(16)}/FFFFFF?text=${(docSnap.data().name || 'م').charAt(0)}`,
        addedAt: serverTimestamp(),
      });

      // Add current user to friend's friend list
      const friendFriendDocRef = doc(db, `/artifacts/${appId}/users/${friendUserId}/friends`, user.uid);
      // You should fetch the current user's profile to add their name/avatar
      const userProfileRef = doc(db, `/artifacts/${appId}/users/${user.uid}/profile`, 'data');
      const userProfileSnap = await getDoc(userProfileRef);
      if (userProfileSnap.exists()) {
        await setDoc(friendFriendDocRef, {
          name: userProfileSnap.data().name || 'مجهول',
          avatar: userProfileSnap.data().avatar || `https://placehold.co/48x48/${Math.floor(Math.random()*16777215).toString(16)}/FFFFFF?text=${(userProfileSnap.data().name || 'م').charAt(0)}`,
          addedAt: serverTimestamp(),
        });
      }


      setMessage('تمت إضافة الصديق بنجاح!');
      setFriendUserId('');
    } catch (error) {
      console.error("Error adding friend:", error);
      setMessage('حدث خطأ أثناء إضافة الصديق.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={() => navigate('/friends')} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200">
          <CornerUpLeft className="w-6 h-6" />
        </button>
        <span className="text-2xl font-extrabold flex-1">إضافة صديق</span>
      </header>

      <div className="flex-1 p-8 flex flex-col items-center justify-center">
        <div className={`w-full max-w-lg p-8 rounded-3xl shadow-2xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <form onSubmit={handleAddFriend} className="space-y-6">
            <div>
              <label htmlFor="friendUserId" className="block text-sm font-medium text-gray-300 mb-2">معرف المستخدم (User ID)</label>
              <input
                id="friendUserId"
                type="text"
                value={friendUserId}
                onChange={(e) => setFriendUserId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                placeholder="أدخل معرف المستخدم"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition duration-300 transform hover:scale-105 disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              {isLoading ? 'جارٍ الإضافة...' : 'إضافة صديق'}
            </button>
          </form>
          {message && (
            <div className={`mt-4 p-4 rounded-xl text-center ${message.includes('بنجاح') ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
              <p>{message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddFriendScreen;
