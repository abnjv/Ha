import React, { useContext } from 'react';
import { LogIn } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';

const LoginScreen = ({ onLogin }) => {
  const { themeClasses } = useContext(ThemeContext);

  const handleLogin = (e) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className={`flex items-center justify-center min-h-screen p-4 ${themeClasses}`}>
      <div className="w-full max-w-md bg-gray-800 rounded-3xl shadow-2xl p-8 transform transition-all duration-300 hover:scale-[1.02]">
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-blue-600 rounded-full mb-4 shadow-lg">
            <LogIn className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">مرحباً!</h1>
          <p className="text-sm text-gray-400">اضغط للمتابعة</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <button
            type="submit"
            className="w-full py-3 px-6 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105"
          >
            تسجيل الدخول
          </button>
        </form>
        <div className="mt-8 text-center">
          <a href="#" className="text-sm text-blue-400 hover:underline">تجاوز تسجيل الدخول</a>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
