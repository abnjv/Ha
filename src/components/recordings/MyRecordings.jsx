import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';

const MyRecordings = () => {
  const { user, db, appId } = useAuth();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecordings = async () => {
      if (!db || !user) {
        setLoading(false);
        return;
      }
      try {
        const recordingsColPath = `apps/${appId}/recordings`;
        const q = query(
          collection(db, recordingsColPath),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const recordingsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecordings(recordingsList);
      } catch (error) {
        console.error("Error fetching recordings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecordings();
  }, [db, user, appId]);

  if (loading) {
    return <div className="text-center p-10">Loading your recordings...</div>;
  }

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-center">My Recordings</h1>
      <div className="max-w-4xl mx-auto">
        {recordings.length === 0 ? (
          <p className="text-center text-gray-400">You have no recordings yet.</p>
        ) : (
          <ul className="space-y-4">
            {recordings.map(rec => (
              <li key={rec.id} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-semibold">Recording from Room: {rec.roomId}</p>
                  <p className="text-sm text-gray-400">
                    Recorded on: {new Date(rec.createdAt?.toDate()).toLocaleString()}
                  </p>
                </div>
                <a
                  href={rec.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Watch
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MyRecordings;
