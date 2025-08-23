import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Send } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import { doc, onSnapshot, collection, addDoc, serverTimestamp, orderBy, query } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { getTicketsPath } from '../../constants';

const TicketDetail = () => {
  const { t } = useTranslation();
  const { ticketId } = useParams();
  const { user, userProfile, db, appId } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode, themeClasses } = useContext(ThemeContext);

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !db || !ticketId) return;

    const ticketRef = doc(db, getTicketsPath(appId), ticketId);
    const unsubscribeTicket = onSnapshot(ticketRef, (docSnap) => {
      if (docSnap.exists()) {
        setTicket({ id: docSnap.id, ...docSnap.data() });
      }
      setIsLoading(false);
    });

    const messagesRef = collection(db, `${getTicketsPath(appId)}/${ticketId}/messages`);
    const q = query(messagesRef, orderBy('createdAt'));
    const unsubscribeMessages = onSnapshot(q, (querySnapshot) => {
      const fetchedMessages = [];
      querySnapshot.forEach((doc) => {
        fetchedMessages.push({ id: doc.id, ...doc.data() });
      });
      setMessages(fetchedMessages);
    });

    return () => {
      unsubscribeTicket();
      unsubscribeMessages();
    };
  }, [user, db, appId, ticketId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const messagesRef = collection(db, `${getTicketsPath(appId)}/${ticketId}/messages`);
    await addDoc(messagesRef, {
      text: newMessage,
      userId: user.uid,
      userName: userProfile.name,
      createdAt: serverTimestamp(),
    });

    const ticketRef = doc(db, getTicketsPath(appId), ticketId);
    await updateDoc(ticketRef, {
      updatedAt: serverTimestamp(),
      status: 'pending', // Re-open ticket on user reply
    });

    setNewMessage('');
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!ticket) {
    return <div className="flex justify-center items-center h-screen">Ticket not found.</div>;
  }

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={() => navigate('/support')} className="p-2 rounded-full hover:bg-gray-700"><ArrowLeft /></button>
        <span className="text-xl font-extrabold flex-1 truncate">{ticket.subject}</span>
        <span className={`px-3 py-1 text-sm rounded-full ${
          ticket.status === 'open' ? 'bg-green-500' :
          ticket.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
        }`}>{ticket.status}</span>
      </header>
      <div className="flex-1 p-8 flex flex-col">
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.userId === user.uid ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-3 rounded-lg max-w-lg ${msg.userId === user.uid ? 'bg-blue-600' : 'bg-gray-700'}`}>
                <p className="text-xs font-bold">{msg.userName}</p>
                <p>{msg.text}</p>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-2 rounded-full bg-gray-700 focus:outline-none"
          />
          <button type="submit" className="p-2 rounded-full bg-blue-600">
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default TicketDetail;
