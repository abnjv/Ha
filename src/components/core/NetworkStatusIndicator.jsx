import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

const NetworkStatusIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // We only render the indicator when the user is offline to be less intrusive.
  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 p-3 rounded-lg shadow-lg bg-red-600 border border-red-700 text-white">
      <div className="flex items-center space-x-2">
        <WifiOff size={20} />
        <span className="font-semibold">You are currently offline.</span>
      </div>
    </div>
  );
};

export default NetworkStatusIndicator;
