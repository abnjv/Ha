import React, { useState, useContext } from 'react';
import { CornerUpLeft } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const CreateRoomScreen = () => {
  const navigate = useNavigate();
  const { user, userProfile, db, appId } = useAuth();
  const [roomTitle, setRoomTitle] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { themeClasses } = useContext(ThemeContext);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!roomTitle || !roomDescription || isLoading || !db) return;

    setIsLoading(true);
    try {
      const roomsCollectionRef = collection(db, `/artifacts/${appId}/public/data/rooms`);
      const newRoom = {
        title: roomTitle,
        description: roomDescription,
        creatorId: user.uid,
        creatorName: userProfile?.name || 'مجهول',
        isLocked: false,
        roomType: 'large_hall', // Default to large_hall
        createdAt: serverTimestamp(),
      };
      await addDoc(roomsCollectionRef, newRoom);
      navigate('/dashboard');
    } catch (error) {
      console.error("Error creating new room:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${themeClasses === 'bg-gray-950 text-white' ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={() => navigate('/dashboard')} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200">
          <CornerUpLeft className="w-6 h-6" />
        </button>
        <span className="text-2xl font-extrabold flex-1">إنشاء غرفة جديدة</span>
      </header>

      <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
        <div className={`w-full max-w-lg p-8 rounded-3xl shadow-2xl ${themeClasses === 'bg-gray-950 text-white' ? 'bg-gray-900' : 'bg-white'}`}>
          <form onSubmit={handleCreateRoom} className="space-y-6">
            <div>
              <label htmlFor="roomTitle" className="block text-sm font-medium text-gray-300 mb-2">اسم الغرفة</label>
              <input
                id="roomTitle"
                type="text"
                value={roomTitle}
                onChange={(e) => setRoomTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                placeholder="أدخل اسمًا للغرفة"
              />
            </div>
            <div>
              <label htmlFor="roomDescription" className="block text-sm font-medium text-gray-300 mb-2">وصف الغرفة</label>
              <textarea
                id="roomDescription"
                value={roomDescription}
                onChange={(e) => setRoomDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                placeholder="أدخل وصفًا للغرفة"
                rows="4"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition duration-300 transform hover:scale-105 disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              {isLoading ? 'جارٍ الإنشاء...' : 'إنشاء الغرفة'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateRoomScreen;
