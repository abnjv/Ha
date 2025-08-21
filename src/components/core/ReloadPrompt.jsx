import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';

function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('Service Worker registered:', r);
    },
    onRegisterError(error) {
      console.error('Service Worker registration error:', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!needRefresh && !offlineReady) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 p-4 rounded-lg shadow-lg bg-gray-800 border border-gray-700 text-white">
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          {needRefresh ? (
            <span>A new version of the app is available!</span>
          ) : (
            <span>App is ready to work offline.</span>
          )}
        </div>
        {needRefresh && (
          <button
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-md flex items-center space-x-2"
            onClick={() => updateServiceWorker(true)}
          >
            <RefreshCw size={18} />
            <span>Reload</span>
          </button>
        )}
        <button className="p-2 hover:bg-gray-700 rounded-full" onClick={() => close()}>
          &times;
        </button>
      </div>
    </div>
  );
}

export default ReloadPrompt;
