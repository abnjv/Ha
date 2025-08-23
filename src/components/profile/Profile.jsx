import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();

  const user = {
    name: 'محمد',
    username: 'mohammed123',
    avatar: '/default-avatar.png', // Assuming a default avatar in public folder
    friendsCount: 42,
    roomsCreated: 15
  };

  const addFriend = () => {
    // To be implemented later
    console.log('إرسال دعوة صداقة');
    alert('Friend request sent!');
  };

  return (
    <div className="profile-container bg-gray-900 text-white min-h-screen p-4 flex flex-col items-center">
      <div className="w-full max-w-md mx-auto">
        <div className="flex justify-start w-full mb-4">
          <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-gray-800">
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>
        <div className="profile-header text-center">
          <img src={user.avatar} alt="صورة الملف الشخصي" className="profile-avatar w-24 h-24 rounded-full mx-auto mb-4 border-4 border-blue-500" />
          <h2 className="text-2xl font-bold">{user.name}</h2>
          <p className="text-gray-400">@{user.username}</p>
        </div>

        <div className="profile-stats flex justify-center gap-8 my-5 p-4 bg-gray-800 rounded-xl">
          <div className="stat text-center">
            <span className="number text-2xl font-bold block">{user.friendsCount}</span>
            <span className="label text-gray-400">أصدقاء</span>
          </div>
          <div className="stat text-center">
            <span className="number text-2xl font-bold block">{user.roomsCreated}</span>
            <span className="label text-gray-400">غرف أنشئت</span>
          </div>
        </div>

        <button onClick={addFriend} className="friend-btn w-full py-3 px-6 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition duration-300">
          إضافة صديق
        </button>
      </div>
    </div>
  );
};

export default Profile;
