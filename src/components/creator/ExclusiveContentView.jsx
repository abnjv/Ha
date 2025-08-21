import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

const ExclusiveContentView = ({ creatorId }) => {
  const { user, db, appId } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user || !db) {
        setLoading(false);
        return;
      }
      try {
        const subsColPath = `apps/${appId}/subscriptions`;
        const q = query(
          collection(db, subsColPath),
          where('subscriberId', '==', user.uid),
          where('creatorId', '==', creatorId)
        );

        const querySnapshot = await getDocs(q);
        let activeSub = null;
        querySnapshot.forEach(doc => {
          const sub = doc.data();
          // Check if subscription is still active
          if (sub.expiresAt && sub.expiresAt.toDate() > new Date()) {
            activeSub = sub;
          }
        });

        if (activeSub) {
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      } catch (e) {
        console.error("Error checking subscription:", e);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [user, db, appId, creatorId]);

  if (loading) {
    return <div className="p-8 text-center">Checking access...</div>;
  }

  return (
    <div className="p-8 bg-gray-800 text-white rounded-lg">
      {hasAccess ? (
        <div>
          <h2 className="text-2xl font-bold text-green-400">Exclusive Content</h2>
          <p>Welcome! You have access to this special content.</p>
          {/* Placeholder for the actual exclusive content */}
          <div className="mt-4 p-4 border border-dashed border-gray-600 rounded">
            <p>Imagine a super secret video or course here!</p>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-2xl font-bold text-red-500">Access Denied</h2>
          <p>You need to subscribe to this creator to view this content.</p>
        </div>
      )}
    </div>
  );
};

export default ExclusiveContentView;
