import React, { useState, useEffect, useContext } from 'react';
import { CornerUpLeft, Plus, Lock, Zap } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

const MainDashboard = ({ onJoinRoom, onBack, userId, onCreateRoom, db, appId }) => {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isDarkMode, themeClasses } = useContext(ThemeContext);

  useEffect(() => {
    if (!db) return;
    const roomsCollectionRef = collection(db, `/artifacts/${appId}/public/data/rooms`);
    const q = query(roomsCollectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedRooms = [];
      querySnapshot.forEach((doc) => {
        fetchedRooms.push({ id: doc.id, ...doc.data() });
      });
      setRooms(fetchedRooms);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching rooms:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db, appId]);

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex justify-between items-center p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200">
          <CornerUpLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-extrabold">غرف المحادثة</span>
        </div>
        <button onClick={onCreateRoom} className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors duration-200">
          <Plus className="w-6 h-6 text-white" />
        </button>
      </header>

      <div className="flex-1 p-8">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">اختر غرفتك الفضائية</h1>
        {userId && (
          <p className="text-sm text-center text-gray-400 mb-8">
            User ID: <span className="font-mono break-all">{userId}</span>
          </p>
        )}
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {rooms.map((room) => (
              <div
                key={room.id}
                className={`p-6 rounded-3xl shadow-xl border-t-2 border-blue-500 transition-all duration-300 transform hover:scale-105 ${room.isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-2xl'} ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
              >
                <h2 className="text-xl md:text-2xl font-bold mb-2">{room.title}</h2>
                <p className="text-sm text-gray-400 mb-4">{room.description}</p>
                <button
                  onClick={() => onJoinRoom(room.id, room.roomType)}
                  disabled={room.isLocked}
                  className={`w-full py-3 px-6 rounded-full font-bold text-white transition-all duration-300 shadow-lg flex items-center justify-center ${
                    room.isLocked
                      ? 'bg-gray-700 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {room.isLocked ? (
                    <>
                      <Lock className="w-5 h-5 ml-2" />
                      قريباً
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 ml-2" />
                      دخول الغرفة
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MainDashboard;
