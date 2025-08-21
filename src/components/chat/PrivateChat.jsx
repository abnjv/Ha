import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CornerUpLeft, Send as SendIcon, MoreHorizontal, Edit, Trash2, MessageSquare, X, Paperclip, File as FileIcon, Gamepad2 } from 'lucide-react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { ThemeContext } from '../../context/ThemeContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, Timestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useAuth } from '../../context/AuthContext';
import { getPrivateChatMessagesPath, getPrivateChatsPath, SUPPORT_BOT_ID, SUPPORT_BOT_NAME, getUserProfilePath } from '../../constants';
import { getBotResponse } from '../../bot/supportBot';
import ProfileModal from '../profile/ProfileModal';
import { get as getKey } from '../../utils/db';
import { importPublicKey, deriveSharedSecret, encryptMessage, decryptMessage, arrayBufferToBase64, base64ToArrayBuffer } from '../../utils/encryption';

const debounce = (func, delay) => { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func(...args), delay); }; };

const PrivateChat = () => {
  const { user, userProfile, db, storage, appId } = useAuth();
  const navigate = useNavigate();
  const { friendId, friendName } = useParams();

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [showOptionsForMessageId, setShowOptionsForMessageId] = useState(null);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [sharedSecretKey, setSharedSecretKey] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const { isDarkMode, themeClasses } = useContext(ThemeContext);
  const chatPartnersId = useMemo(() => user && friendId ? [user.uid, friendId].sort().join('_') : null, [user, friendId]);
  const isChatWithBot = friendId === SUPPORT_BOT_ID;

  // Effect for E2E Encryption Setup
  useEffect(() => {
    const setupEncryption = async () => {
      if (isChatWithBot || !user || !db) return;
      try {
        const privateKey = await getKey(`ecdh_private_key_${user.uid}`);
        if (!privateKey) throw new Error("Private key not found.");

        const friendDocRef = doc(db, getUserProfilePath(appId, friendId));
        const friendDoc = await getDoc(friendDocRef);
        if (!friendDoc.exists() || !friendDoc.data().publicKey) throw new Error("Friend's public key not found.");

        const friendPublicKey = await importPublicKey(friendDoc.data().publicKey);
        const secret = await deriveSharedSecret(privateKey, friendPublicKey);
        setSharedSecretKey(secret);
      } catch (error) {
        console.error("E2EE setup failed:", error);
      }
    };
    setupEncryption();
  }, [user, friendId, db, appId, isChatWithBot]);

  // Effect for fetching messages
  useEffect(() => {
    if (isChatWithBot) {
      setIsLoading(false);
      setMessages([{ id: 'initial-bot-message', senderId: SUPPORT_BOT_ID, text: 'Hello! How can I help you today?', createdAt: { toDate: () => new Date() } }]);
      return;
    }
    if (!db || !chatPartnersId) {
      setIsLoading(false);
      return;
    };
    const q = query(collection(db, getPrivateChatMessagesPath(appId, chatPartnersId)), orderBy('createdAt'));
    const unsub = onSnapshot(q, (snap) => { setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setIsLoading(false); });
    return unsub;
  }, [db, appId, chatPartnersId, isChatWithBot]);

  // Other effects...
  useEffect(() => { /* ... (typing status, scroll to bottom) ... */ }, [messages, db, appId, chatPartnersId, user.uid, isChatWithBot]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);


  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (inputMessage.trim() === '') return;
    setIsSendingMessage(true);

    if (isChatWithBot) {
      // ... (bot logic remains the same)
    } else {
      if (!sharedSecretKey) {
        alert("Encryption keys are not ready. Please wait.");
        setIsSendingMessage(false);
        return;
      }
      try {
        const { encryptedData, iv } = await encryptMessage(inputMessage, sharedSecretKey);
        const messagePayload = {
          ct: arrayBufferToBase64(encryptedData),
          iv: arrayBufferToBase64(iv),
        };
        await addDoc(collection(db, getPrivateChatMessagesPath(appId, chatPartnersId)), { type: 'encrypted_text', content: messagePayload, senderId: user.uid, createdAt: serverTimestamp() });
      } catch (error) {
        console.error("Failed to send encrypted message:", error);
      }
    }

    setInputMessage('');
    setIsSendingMessage(false);
  };

  const handleInviteGame = () => {
    navigate('/game/lobby', { state: { invite: { targetUserId: friendId, targetUserName: friendName } } });
  };

  // ... (other handlers like file upload, delete message, etc. remain)
  const handleFileChange = (e) => { /* ... */ };
  const uploadFile = (file) => { /* ... */ };
  const handleDeleteMessage = async (msgId) => { /* ... */ };
  const startEditing = (msg) => { /* ... */ };
  const handleUpdateMessage = async (e) => { /* ... */ };
  const startReplying = (msg) => { /* ... */ };


  const DecryptedMessage = ({ message }) => {
    // ... (decryption component remains the same)
    const [decryptedText, setDecryptedText] = useState('...');
    useEffect(() => {
        const decrypt = async () => {
            if (message.type === 'encrypted_text' && message.content && sharedSecretKey) {
                try {
                    const encryptedData = base64ToArrayBuffer(message.content.ct);
                    const iv = base64ToArrayBuffer(message.content.iv);
                    const decrypted = await decryptMessage(encryptedData, iv, sharedSecretKey);
                    setDecryptedText(decrypted);
                } catch (e) { setDecryptedText('[Decryption Error]'); }
            } else { setDecryptedText(message.text); }
        };
        decrypt();
    }, [message, sharedSecretKey]);
    return <p>{decryptedText}</p>;
  };

  return (
    <div className={`relative flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-2 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={() => navigate('/private-chat-list')} className="p-2 rounded-full hover:bg-gray-700"><CornerUpLeft/></button>
        <button onClick={() => !isChatWithBot && setIsProfileModalOpen(true)} className="text-2xl font-extrabold flex-1 text-start hover:underline" disabled={isChatWithBot}>{friendName}</button>
        {!isChatWithBot && (<button onClick={handleInviteGame} title="Play Tic-Tac-Toe" className="p-2 rounded-full hover:bg-gray-700"><Gamepad2 className="w-6 h-6 text-purple-500" /></button>)}
      </header>
      {/* ... (rest of the chat JSX remains largely the same, without the GameOverlay) ... */}
       <div className={`flex-1 flex flex-col p-4 rounded-3xl shadow-xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="flex-1 overflow-y-auto mb-4 p-4 space-y-4 custom-scrollbar">
            {/* Message mapping logic using DecryptedMessage */}
        </div>
        <div className="border-t border-gray-700 pt-4">
            {/* Form for sending messages */}
        </div>
      </div>
      {isProfileModalOpen && <ProfileModal userId={friendId} onClose={() => setIsProfileModalOpen(false)} />}
    </div>
  );
};

export default PrivateChat;
