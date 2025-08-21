import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { BarChart, Edit, Trash2 } from 'lucide-react';
import UploadSystem from '../shared/UploadSystem';

const CreatorDashboard = () => {
  const { user, userProfile, db, appId } = useAuth();
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', type: 'background', price: 100, imageUrl: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userProfile?.isCreator || !user) return;
    const fetchCreatorItems = async () => {
      setLoading(true);
      try {
        const itemsCollectionPath = `apps/${appId}/virtualItems`;
        const q = query(collection(db, itemsCollectionPath), where('creatorId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const creatorItems = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setItems(creatorItems);
      } catch (e) {
        console.error("Error fetching creator items:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchCreatorItems();
  }, [user, userProfile, db, appId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem(prev => ({ ...prev, [name]: name === 'price' ? parseInt(value, 10) || 0 : value }));
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.imageUrl) {
      setError('Name and Image URL are required.');
      return;
    }
    setError('');
    try {
      const itemsCollectionPath = `apps/${appId}/virtualItems`;
      const docRef = await addDoc(collection(db, itemsCollectionPath), {
        ...newItem,
        creatorId: user.uid,
      });
      // Refresh list optimistically
      setItems(prev => [...prev, { ...newItem, creatorId: user.uid, id: docRef.id }]);
      setNewItem({ name: '', type: 'background', price: 100, imageUrl: '' });
    } catch (e) {
      console.error("Error adding item:", e);
      setError('Failed to add item.');
    }
  };

  const handleImageUpload = (url) => {
    setNewItem(prev => ({ ...prev, imageUrl: url }));
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      const itemDocRef = doc(db, `apps/${appId}/virtualItems`, itemId);
      await deleteDoc(itemDocRef);
      setItems(prev => prev.filter(item => item.id !== itemId));
    } catch (e) {
      console.error("Error deleting item: ", e);
      alert("Failed to delete item.");
    }
  };

  const handleEditItem = (item) => {
    // For now, this is a placeholder. A real implementation would open a modal.
    alert(`Editing for "${item.name}" is not implemented yet.`);
  };

  if (!userProfile) {
    return <div className="p-8 text-center">Loading profile...</div>;
  }
  if (!userProfile.isCreator) {
    return (
        <div className="p-8 text-center text-white min-h-screen bg-gray-900">
            <h1 className="text-2xl text-red-500">Access Denied</h1>
            <p>You do not have creator access.</p>
        </div>
    );
  }

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-4xl font-bold mb-8">Creator Dashboard</h1>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800 p-4 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-gray-400">Total Subscribers</h3>
          <p className="text-3xl font-bold">1,234</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-gray-400">Monthly Revenue</h3>
          <p className="text-3xl font-bold">$5,678</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-gray-400">Published Items</h3>
          <p className="text-3xl font-bold">{items.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Add New Item</h2>
          <form onSubmit={handleAddItem} className="space-y-4 p-6 bg-gray-800 rounded-lg">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300">Item Name</label>
                <input id="name" type="text" name="name" value={newItem.name} onChange={handleInputChange} placeholder="My Awesome Background" className="mt-1 w-full p-2 rounded bg-gray-700 border border-gray-600" />
            </div>
            <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-300">Item Type</label>
                <select id="type" name="type" value={newItem.type} onChange={handleInputChange} className="mt-1 w-full p-2 rounded bg-gray-700 border border-gray-600">
                  <option value="background">Background</option>
                  <option value="mic_skin">Microphone Skin</option>
                </select>
            </div>
             <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-300">Price (Jules Coins)</label>
                <input id="price" type="number" name="price" value={newItem.price} onChange={handleInputChange} placeholder="100" className="mt-1 w-full p-2 rounded bg-gray-700 border border-gray-600" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300">Item Image</label>
                <UploadSystem
                  onUploadSuccess={handleImageUpload}
                  uploadPath={`creator_items/${user?.uid}`}
                />
                {newItem.imageUrl && (
                  <div className="mt-2">
                    <p className="text-xs text-green-400">Image uploaded successfully!</p>
                    <img src={newItem.imageUrl} alt="Preview" className="w-24 h-24 object-cover rounded-lg mt-1" />
                  </div>
                )}
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="w-full p-3 bg-blue-600 rounded hover:bg-blue-700 font-bold">Add Item</button>
          </form>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Your Published Items</h2>
          {loading ? <p>Loading items...</p> : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {items.length === 0 && <p className="text-gray-400">You haven't published any items yet.</p>}
              {items.map(item => (
                <div key={item.id} className="bg-gray-700 p-3 rounded flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.type}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-400 font-bold">{item.price} coins</span>
                    <button onClick={() => handleEditItem(item)} className="p-1 hover:text-blue-400"><Edit size={16} /></button>
                    <button onClick={() => handleDeleteItem(item.id)} className="p-1 hover:text-red-400"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatorDashboard;
