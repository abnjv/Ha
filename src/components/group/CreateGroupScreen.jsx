import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerUpLeft, Users, Check } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { collection, query, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { getUserFriendsPath, getGroupsPath } from '../../constants';

const CreateGroupScreen = () => {
  const { user, userProfile, db, appId } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode, themeClasses } = useContext(ThemeContext);
  const [groupName, setGroupName] = useState('');
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch user's friends
  useEffect(() => {
    if (!db || !user?.uid) return;
    const friendsPath = getUserFriendsPath(appId, user.uid);
    const q = query(collection(db, friendsPath));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFriends(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [db, user, appId]);

  const handleToggleFriend = (friendId) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError('Group name is required.');
      return;
    }
    if (selectedFriends.length === 0) {
        setError('You must select at least one friend to form a group.');
        return;
    }

    setIsLoading(true);
    setError('');

    const members = {
      [user.uid]: { role: 'owner', name: userProfile?.name || 'Owner' }
    };

    friends.forEach(friend => {
      if (selectedFriends.includes(friend.id)) {
        members[friend.id] = { role: 'member', name: friend.name || 'Member' };
      }
    });

    try {
      const groupsCollectionRef = collection(db, getGroupsPath(appId));
      const newGroupDoc = await addDoc(groupsCollectionRef, {
        name: groupName,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        members,
      });
      console.log('Group created with ID:', newGroupDoc.id);
      // Navigate to the new group chat - this route needs to be created
      navigate(`/group-chat/${newGroupDoc.id}`);
    } catch (err) {
      console.error("Error creating group:", err);
      setError('Failed to create group. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-700">
          <CornerUpLeft />
        </button>
        <h1 className="text-2xl font-extrabold flex-1">Create New Group</h1>
      </header>

      <div className="flex-1 p-8 flex flex-col items-center">
        <form onSubmit={handleCreateGroup} className={`w-full max-w-lg p-8 rounded-3xl shadow-2xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <div className="space-y-6">
            <div>
              <label htmlFor="groupName" className="block text-sm font-medium mb-2">Group Name</label>
              <input
                id="groupName"
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter a name for your group"
              />
            </div>

            <div>
              <h2 className="text-lg font-bold mb-2">Invite Friends</h2>
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-2 bg-gray-800 rounded-lg">
                {friends.length > 0 ? friends.map(friend => (
                  <div key={friend.id} onClick={() => handleToggleFriend(friend.id)} className={`flex items-center p-3 rounded-lg cursor-pointer ${selectedFriends.includes(friend.id) ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                    <img src={friend.avatar} alt={friend.name} className="w-10 h-10 rounded-full mr-4" />
                    <span className="flex-1 font-bold">{friend.name}</span>
                    {selectedFriends.includes(friend.id) && <Check className="text-white" />}
                  </div>
                )) : <p className="text-gray-400 text-center">You have no friends to invite yet.</p>}
              </div>
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition duration-300 disabled:bg-gray-700"
            >
              {isLoading ? 'Creating Group...' : 'Create Group & Start Chatting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupScreen;
