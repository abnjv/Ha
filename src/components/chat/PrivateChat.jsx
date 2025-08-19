import React, { useState, useEffect, useRef, useContext } from 'react';
import { CornerUpLeft, Send as SendIcon } from 'lucide-react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { ThemeContext } from '../../context/ThemeContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';

const PrivateChat = () => {
  const navigate = useNavigate();
  const { friendId } = useParams();
  // We need a way to get the friend's name. This should be passed in state or fetched.
  // For now, we'll leave it as a placeholder.
  const friendName = "Friend";
  const { user, db, appId } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const { isDarkMode, themeClasses } = useContext(ThemeContext);

  useEffect(() => {
    if (!db || !user?.uid) return;

    const chatPartners = [user.uid, friendId].sort().join('_');
    const privateChatPath = `/artifacts/${appId}/public/data/private_chats/${chatPartners}/messages`;
    const q = query(collection(db, privateChatPath), orderBy('createdAt'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedMessages = [];
      querySnapshot.forEach((doc) => {
        fetchedMessages.push({ id: doc.id, ...doc.data() });
      });
      setMessages(fetchedMessages);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching private messages:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, friendId, db, appId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (inputMessage.trim() === '' || !db || isSendingMessage) return;

    setIsSendingMessage(true);
    const chatPartners = [user.uid, friendId].sort().join('_');
    const privateChatPath = `/artifacts/${appId}/public/data/private_chats/${chatPartners}/messages`;

    try {
      await addDoc(collection(db, privateChatPath), {
        senderId: user.uid,
        text: inputMessage,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending private message:", error);
    }

    setInputMessage('');
    setIsSendingMessage(false);
  };

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={() => navigate('/chats')} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200">
          <CornerUpLeft className="w-6 h-6" />
        </button>
        <span className="text-2xl font-extrabold flex-1">{friendName}</span>
      </header>

      <div className={`flex-1 flex flex-col p-4 rounded-3xl shadow-xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="flex-1 overflow-y-auto mb-4 p-4 space-y-4 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-blue-500"></div>
            </div>
          ) : (
            <TransitionGroup>
              {messages.map((message) => (
                <CSSTransition key={message.id} timeout={300} classNames="message-item">
                  <div className={`message-item flex ${message.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs md:max-w-md p-3 rounded-xl shadow-md ${message.senderId === user.uid ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'}`}>
                      <p>{message.text}</p>
                      <span className={`block mt-1 text-xs ${message.senderId === user.uid ? 'text-blue-200' : 'text-gray-500'}`}>
                        {message.createdAt ? new Date(message.createdAt.seconds * 1000).toLocaleTimeString('ar-SA') : 'الآن'}
                      </span>
                    </div>
                  </div>
                </CSSTransition>
              ))}
            </TransitionGroup>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="flex space-x-2 space-x-reverse border-t border-gray-700 pt-4">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="أرسل رسالة..."
            className="flex-1 p-3 rounded-full bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" disabled={isSendingMessage} className="p-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 disabled:bg-gray-700">
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default PrivateChat;
