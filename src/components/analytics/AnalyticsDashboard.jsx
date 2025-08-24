import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BarChart2, Users, Radio } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import { Bar } from 'react-chartjs-2';

const AnalyticsDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isDarkMode, themeClasses } = useContext(ThemeContext);

  const totalUsers = 1500;
  const activeRooms = 42;
  const currentOnline = 128;
  const roomTypes = [
    { type: 'صوتية', count: 25 },
    { type: 'نصية', count: 12 },
    { type: 'ألعاب', count: 5 }
  ];

  const chartData = {
    labels: roomTypes.map(rt => rt.type),
    datasets: [{
      label: 'Room Types',
      data: roomTypes.map(rt => rt.count),
      backgroundColor: 'rgba(54, 162, 235, 0.6)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    }]
  };

  const exportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "اسم المستخدم,البريد الإلكتروني,الحالة\n"
      + "user1,user1@example.com,active\n"
      + "user2,user2@example.com,inactive\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "users.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-gray-700"><ArrowLeft /></button>
        <span className="text-2xl font-extrabold flex-1">{t('analyticsDashboard')}</span>
      </header>
      <div className="flex-1 p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className={`stat-card p-4 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-lg font-bold flex items-center"><Users className="mr-2" /> {t('totalUsers')}</h3>
            <p className="text-3xl font-bold">{totalUsers}</p>
          </div>
          <div className={`stat-card p-4 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-lg font-bold flex items-center"><Radio className="mr-2" /> {t('activeRooms')}</h3>
            <p className="text-3xl font-bold">{activeRooms}</p>
          </div>
          <div className={`stat-card p-4 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-lg font-bold flex items-center"><BarChart2 className="mr-2" /> {t('currentOnline')}</h3>
            <p className="text-3xl font-bold">{currentOnline}</p>
          </div>
        </div>
        <div className={`chart-container p-4 rounded-xl shadow-lg mb-8 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className="text-lg font-bold mb-4">{t('roomTypeDistribution')}</h3>
          <Bar data={chartData} />
        </div>
        <button onClick={exportCSV} className="export-btn w-full py-3 px-6 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700">
          {t('exportUserData')} (CSV)
        </button>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
