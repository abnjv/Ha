import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, doc, updateDoc, arrayUnion, addDoc, serverTimestamp } from 'firebase/firestore';
import { getUserProfilePath } from '../../constants';

const VirtualStore = () => {
  const { user, userProfile, db, appId } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null); // State to track which item is being purchased

  useEffect(() => {
    const fetchItems = async () => {
      if (!db) return;
      try {
        const itemsCollectionPath = `apps/${appId}/virtualItems`;
        const querySnapshot = await getDocs(collection(db, itemsCollectionPath));
        const itemsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setItems(itemsList);
      } catch (error) {
        console.error("Error fetching virtual items:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [db, appId]);

  const handleSubscribe = async (item) => {
    // Placeholder for subscription logic
    alert(`Subscribing to ${item.name} is not implemented yet.`);
  };

  const logTransaction = async (transactionData) => {
    try {
      const transactionsColPath = `apps/${appId}/transactions`;
      await addDoc(collection(db, transactionsColPath), {
        ...transactionData,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Failed to log transaction:", e);
    }
  };

  const handleBuy = async (item) => {
    if (item.type === 'subscription') {
      await handleSubscribe(item);
      return;
    }

    if (!user || !userProfile) {
      alert("You must be logged in to make a purchase.");
      return;
    }
    if (userProfile.purchasedItems?.includes(item.id)) {
      alert("You already own this item!");
      return;
    }
    if (userProfile.julesCoins < item.price) {
      alert("You don't have enough Jules Coins!");
      return;
    }

    setPurchasing(item.id);
    const transactionId = `${user.uid}-${item.id}-${Date.now()}`;
    try {
      const userDocRef = doc(db, getUserProfilePath(appId, user.uid));
      const newCoinBalance = userProfile.julesCoins - item.price;

      // This is a client-side transaction. For higher security,
      // this should be a server-side transaction using Firebase Functions.
      await updateDoc(userDocRef, {
        julesCoins: newCoinBalance,
        purchasedItems: arrayUnion(item.id)
      });

      await logTransaction({
        transactionId,
        userId: user.uid,
        itemId: item.id,
        itemName: item.name,
        price: item.price,
        status: 'SUCCESS',
      });

      alert(`Successfully purchased ${item.name}!`);
    } catch (error) {
      await logTransaction({
        transactionId,
        userId: user.uid,
        itemId: item.id,
        itemName: item.name,
        price: item.price,
        status: 'FAILED',
        error: error.message,
      });
      console.error("Purchase failed:", error);
      alert("An error occurred during the purchase. Please try again.");
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return <div className="text-center p-10">Loading Store...</div>;
  }

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-center">Virtual Store</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {items.map((item) => {
          const alreadyOwned = userProfile?.purchasedItems?.includes(item.id);
          return (
            <div key={item.id} className="bg-gray-800 rounded-lg p-4 flex flex-col shadow-lg transition-transform transform hover:scale-105">
              <img src={item.imageUrl} alt={item.name} className="w-full h-40 object-cover rounded-md mb-4" />
              <h2 className="text-xl font-semibold mb-2 flex-grow">{item.name}</h2>
              {item.creatorId && <p className="text-xs text-gray-400 mb-2 self-start">By: {item.creatorId === 'SYSTEM' ? 'Official Store' : item.creatorId.substring(0, 10)}</p>}
              <p className="text-yellow-400 text-lg mb-4 font-bold self-start">{item.price} Jules Coins</p>
              <button
                onClick={() => handleBuy(item)}
                disabled={alreadyOwned || purchasing === item.id}
                className={`w-full font-bold py-2 px-4 rounded ${
                  alreadyOwned
                    ? 'bg-green-700 cursor-not-allowed'
                    : purchasing === item.id
                    ? 'bg-gray-500 cursor-wait'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {alreadyOwned ? 'Owned' : purchasing === item.id ? 'Purchasing...' : 'Buy'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualStore;
