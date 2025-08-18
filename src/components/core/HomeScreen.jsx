import React, { useContext } from 'react';
import { LogOut, Users, MessageSquare, User as UserIcon, Home, Bell, Moon, Sun } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';

const HomeScreen = ({ onGoToRooms, onGoToPrivateChatList, onLogout, userId, onGoToProfile, onToggleNotifications, hasNotifications, onGoToFriendList }) => {
  const { isDarkMode, toggleDarkMode, themeClasses } = useContext(ThemeContext);

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex justify-between items-center p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-600 rounded-full">
            <Home className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-extrabold">AirChat</span>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200">
            {isDarkMode ? <Sun className="w-6 h-6 text-yellow-500" /> : <Moon className="w-6 h-6 text-gray-600" />}
          </button>
          <button onClick={onGoToProfile} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200" title="ملفي الشخصي">
            <UserIcon className="w-6 h-6 text-blue-500" />
          </button>
          <button onClick={onGoToFriendList} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200" title="أصدقائي">
            <Users className="w-6 h-6 text-pink-500" />
          </button>
          <button onClick={onToggleNotifications} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200 relative">
            <Bell className="w-6 h-6 text-white" />
            {hasNotifications && <span className="absolute top-1 right-1 block h-2 w-2 rounded-full ring-2 ring-gray-900 bg-red-500"></span>}
          </button>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-full font-bold shadow-lg hover:bg-red-700 transition-colors duration-200"
          >
            <LogOut className="w-4 h-4 inline-block ml-1" />
            تسجيل الخروج
          </button>
        </div>
      </header>

      <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
        <div className={`p-8 rounded-3xl shadow-2xl max-w-2xl w-full ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <h1 className="text-3xl md:text-4xl font-bold mb-6">مرحباً في AirChat!</h1>
          {userId && (
            <p className="text-sm text-center text-gray-400 mb-8">
              User ID: <span className="font-mono break-all">{userId}</span>
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <button
              onClick={onGoToRooms}
              className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl flex flex-col items-center justify-center transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg"
            >
              <Users className="w-10 h-10 mb-2" />
              <span className="text-xl font-bold">غرف المحادثة</span>
              <p className="text-sm text-blue-200 mt-1">انضم إلى غرف الدردشة الصوتية</p>
            </button>
            <button
              onClick={onGoToPrivateChatList}
              className="p-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl flex flex-col items-center justify-center transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg"
            >
              <MessageSquare className="w-10 h-10 mb-2" />
              <span className="text-xl font-bold">الدردشة الخاصة</span>
              <p className="text-sm text-purple-200 mt-1">تحدث مع أصدقائك مباشرة</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
