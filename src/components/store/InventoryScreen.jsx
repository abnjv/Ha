import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getUserProfilePath } from '../../constants';

const InventoryScreen = () => {
  const { user, userProfile, db, appId } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [equippedItems, setEquippedItems] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      if (!db || !userProfile?.purchasedItems || userProfile.purchasedItems.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const itemsCollectionPath = `apps/${appId}/virtualItems`;
        const q = query(collection(db, itemsCollectionPath), where('__name__', 'in', userProfile.purchasedItems));
        const querySnapshot = await getDocs(q);
        const itemsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInventory(itemsList);
        setEquippedItems(userProfile.equippedItems || {});
      } catch (error) {
        console.error("Error fetching inventory:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [db, appId, userProfile]);

  const handleEquip = async (item) => {
    if (!user) return;
    const newEquipped = { ...equippedItems, [item.type]: item.id };

    try {
      const userDocRef = doc(db, getUserProfilePath(appId, user.uid));
      await updateDoc(userDocRef, {
        equippedItems: newEquipped
      });
      setEquippedItems(newEquipped);
      alert(`Successfully equipped ${item.name}!`);
    } catch (error) {
      console.error("Failed to equip item:", error);
      alert("There was an error equipping your item.");
    }
  };

  if (loading) {
    return <div className="text-center p-10">Loading Inventory...</div>;
  }

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-center">My Inventory</h1>
      {inventory.length === 0 ? (
        <p className="text-center text-gray-400">You don't own any items yet. Visit the store to buy some!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {inventory.map((item) => (
            <div key={item.id} className="bg-gray-800 rounded-lg p-4 flex flex-col items-center shadow-lg">
              <img src={item.imageUrl} alt={item.name} className="w-full h-40 object-cover rounded-md mb-4" />
              <h2 className="text-xl font-semibold mb-2">{item.name}</h2>
              <button
                onClick={() => handleEquip(item)}
                disabled={equippedItems[item.type] === item.id}
                className={`w-full font-bold py-2 px-4 rounded ${
                  equippedItems[item.type] === item.id
                    ? 'bg-green-700 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {equippedItems[item.type] === item.id ? 'Equipped' : 'Equip'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InventoryScreen;
