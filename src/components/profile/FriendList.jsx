import React, { useState, useEffect, useContext } from 'react';
import { CornerUpLeft, UserPlus, UserMinus } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import { collection, query, onSnapshot } from 'firebase/firestore';

const FriendList = ({ onBack, userId, onAddFriend, onRemoveFriend, db, appId }) => {
  const { isDarkMode, themeClasses } = useContext(ThemeContext);
  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !userId) return;
    const friendsCollectionRef = collection(db, `/artifacts/${appId}/users/${userId}/friends`);
    const q = query(friendsCollectionRef);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedFriends = [];
      querySnapshot.forEach(doc => {
        fetchedFriends.push({ id: doc.id, ...doc.data() });
      });
      setFriends(fetchedFriends);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching friends:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId, db, appId]);

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200">
          <CornerUpLeft className="w-6 h-6" />
        </button>
        <span className="text-2xl font-extrabold flex-1">قائمة الأصدقاء</span>
        <button onClick={onAddFriend} className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors duration-200">
          <UserPlus className="w-6 h-6 text-white" />
        </button>
      </header>
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">أصدقائي</h1>
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-blue-500"></div>
          </div>
        ) : friends.length > 0 ? (
          <div className="space-y-4">
            {friends.map(friend => (
              <div key={friend.id} className={`flex items-center p-4 rounded-2xl shadow-md transition-colors duration-200 ${isDarkMode ? 'bg-gray-900 hover:bg-gray-800' : 'bg-white hover:bg-gray-100'}`}>
                <div className="flex-1 flex items-center space-x-4 space-x-reverse">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <img src={friend.avatar || `https://placehold.co/48x48/${Math.floor(Math.random()*16777215).toString(16)}/FFFFFF?text=${friend.name.charAt(0)}`} alt={friend.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="font-bold">{friend.name}</span>
                </div>
                <button
                  onClick={() => onRemoveFriend(friend.id)}
                  className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors duration-200"
                >
                  <UserMinus className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-10">
            <p>لا يوجد أصدقاء. أضف أصدقاءك الآن!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendList;
