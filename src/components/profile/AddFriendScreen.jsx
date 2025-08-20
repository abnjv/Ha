import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerUpLeft } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { getUserProfilePath, getUserFriendsPath, getFriendRequestsPath } from '../../constants';

const AddFriendScreen = () => {
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
      setMessage('لا يمكنك إرسال طلب صداقة لنفسك.');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Check if they are already friends
      const friendDocRef = doc(db, getUserFriendsPath(appId, user.uid), friendUserId);
      const friendDocSnap = await getDoc(friendDocRef);
      if (friendDocSnap.exists()) {
        setMessage('أنتما صديقان بالفعل.');
        setIsLoading(false);
        return;
      }

      // 2. Check if a request already exists
      const requestsRef = collection(db, getFriendRequestsPath(appId));
      const q1 = query(requestsRef, where('from', '==', user.uid), where('to', '==', friendUserId));
      const q2 = query(requestsRef, where('from', '==', friendUserId), where('to', '==', user.uid));

      const [query1Snapshot, query2Snapshot] = await Promise.all([getDocs(q1), getDocs(q2)]);

      if (!query1Snapshot.empty || !query2Snapshot.empty) {
        setMessage('يوجد طلب صداقة معلق بالفعل مع هذا المستخدم.');
        setIsLoading(false);
        return;
      }

      // 3. Check if the target user exists
      const friendProfileRef = doc(db, getUserProfilePath(appId, friendUserId));
      const docSnap = await getDoc(friendProfileRef);

      if (!docSnap.exists()) {
        setMessage('لم يتم العثور على مستخدم بهذا المعرف.');
        setIsLoading(false);
        return;
      }

      // 4. Create the friend request
      await addDoc(requestsRef, {
        from: user.uid,
        to: friendUserId,
        fromName: userProfile?.name || 'مستخدم جديد',
        fromAvatar: userProfile?.avatar || `https://placehold.co/48x48/${Math.floor(Math.random()*16777215).toString(16)}/FFFFFF?text=${(userProfile?.name || 'م').charAt(0)}`,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      setMessage('تم إرسال طلب الصداقة بنجاح!');
      setFriendUserId('');
    } catch (error) {
      console.error("Error sending friend request:", error);
      setMessage('حدث خطأ أثناء إرسال الطلب.');
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
          <form onSubmit={handleSendFriendRequest} className="space-y-6">
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
              className="w-full py-3 px-6 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105 disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              {isLoading ? 'جارٍ الإرسال...' : 'إرسال طلب صداقة'}
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
