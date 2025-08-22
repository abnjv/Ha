import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CornerUpLeft, Send as SendIcon, MoreHorizontal, Edit, Trash2, MessageSquare, X, Paperclip, File as FileIcon, Gamepad2, Languages } from 'lucide-react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { ThemeContext } from '../../context/ThemeContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, Timestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useAuth } from '../../context/AuthContext';
import { getPrivateChatMessagesPath, getPrivateChatsPath, SUPPORT_BOT_ID, SUPPORT_BOT_NAME, SUPPORT_BOT_AVATAR, getUserProfilePath } from '../../constants';
import { getBotResponse } from '../../bot/supportBot';
import ProfileModal from '../profile/ProfileModal';
import { get as getKey } from '../../utils/db';
import { importPublicKey, deriveSharedSecret, encryptMessage, decryptMessage, arrayBufferToBase64, base64ToArrayBuffer } from '../../utils/encryption';
import { translate } from '../../utils/translation';

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
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isTranslationEnabled, setIsTranslationEnabled] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('en');

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
    if (inputMessage.trim() === '' || isSendingMessage) return;
    setIsSendingMessage(true);

    if (isChatWithBot) {
      const userMessage = { id: `user-${Date.now()}`, senderId: user.uid, text: inputMessage, createdAt: { toDate: () => new Date() } };
      setMessages(prev => [...prev, userMessage]);
      setIsBotTyping(true);

      setTimeout(() => {
        const botResponseText = getBotResponse(inputMessage);
        const botMessage = { id: `bot-${Date.now()}`, senderId: SUPPORT_BOT_ID, text: botResponseText, createdAt: { toDate: () => new Date() } };
        setMessages(prev => [...prev, botMessage]);
        setIsBotTyping(false);
      }, 1200 + Math.random() * 800); // Add jitter to delay
    } else {
      if (!sharedSecretKey) {
        alert("Encryption keys are not ready. Please wait.");
        setIsSendingMessage(false);
        return;
      }
      try {
        const messageText = inputMessage;
        let translatedText = null;

        if (isTranslationEnabled) {
          try {
            translatedText = await translate(messageText, targetLanguage);
          } catch (e) {
            console.error("Translation failed, sending original message only.", e);
          }
        }

        const { encryptedData, iv } = await encryptMessage(messageText, sharedSecretKey);
        const messagePayload = {
          ct: arrayBufferToBase64(encryptedData),
          iv: arrayBufferToBase64(iv),
        };

        const docToSend = {
            type: 'encrypted_text',
            content: messagePayload,
            senderId: user.uid,
            createdAt: serverTimestamp(),
            // A simple guess of the user's language from browser settings
            originalLanguage: navigator.language ? navigator.language.split('-')[0] : 'en',
        };

        if (translatedText) {
            const { encryptedData: translatedEncryptedData, iv: translatedIv } = await encryptMessage(translatedText, sharedSecretKey);
            docToSend.translation = {
                targetLanguage: targetLanguage,
                content: {
                    ct: arrayBufferToBase64(translatedEncryptedData),
                    iv: arrayBufferToBase64(translatedIv)
                }
            };
        }

        await addDoc(collection(db, getPrivateChatMessagesPath(appId, chatPartnersId)), docToSend);
      } catch (error) {
        console.error("Failed to send message:", error);
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


  const DecryptedMessage = ({ message, isMyMessage }) => {
    const [decryptedText, setDecryptedText] = useState('...');
    const [decryptedTranslation, setDecryptedTranslation] = useState(null);
    const [showOriginal, setShowOriginal] = useState(false);

    const hasTranslation = message.translation && message.translation.content;
    // Show translation if it's enabled, it's not my message, and a translation exists.
    const shouldTranslate = isTranslationEnabled && !isMyMessage && hasTranslation;

    useEffect(() => {
        const decrypt = async () => {
            if (!sharedSecretKey || !message.content) {
                setDecryptedText('[Encryption key missing]');
                return;
            }

            try {
                // Always decrypt the original message
                const originalEncrypted = base64ToArrayBuffer(message.content.ct);
                const originalIv = base64ToArrayBuffer(message.content.iv);
                const originalDecrypted = await decryptMessage(originalEncrypted, originalIv, sharedSecretKey);
                setDecryptedText(originalDecrypted);

                // Decrypt translation if it exists
                if (hasTranslation) {
                    const translatedEncrypted = base64ToArrayBuffer(message.translation.content.ct);
                    const translatedIv = base64ToArrayBuffer(message.translation.content.iv);
                    const translationDecrypted = await decryptMessage(translatedEncrypted, translatedIv, sharedSecretKey);
                    setDecryptedTranslation(translationDecrypted);
                } else {
                    setDecryptedTranslation(null);
                }
            } catch (e) {
                console.error("Decryption failed:", e);
                setDecryptedText('[Decryption Error]');
                setDecryptedTranslation(null);
            }
        };
        decrypt();
    }, [message, sharedSecretKey, hasTranslation]);

    const displayText = shouldTranslate && !showOriginal && decryptedTranslation ? decryptedTranslation : decryptedText;
    const canToggle = shouldTranslate && decryptedTranslation;

    return (
      <div>
        <p>{displayText}</p>
        {canToggle && (
          <button onClick={() => setShowOriginal(prev => !prev)} className="text-xs opacity-70 hover:opacity-100 mt-1 cursor-pointer underline">
            {showOriginal ? `Show Translation` : 'Show Original'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={`relative flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-2 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={() => navigate('/private-chat-list')} className="p-2 rounded-full hover:bg-gray-700"><CornerUpLeft/></button>
        <button onClick={() => !isChatWithBot && setIsProfileModalOpen(true)} className="text-2xl font-extrabold flex-1 text-start hover:underline" disabled={isChatWithBot}>{friendName}</button>

        {!isChatWithBot && (
          <div className="flex items-center space-x-2">
            <button onClick={() => setIsTranslationEnabled(prev => !prev)} title="Toggle Translation" className={`p-2 rounded-full hover:bg-gray-700 ${isTranslationEnabled ? 'bg-blue-600 text-white' : ''}`}>
              <Languages className="w-6 h-6" />
            </button>
            {isTranslationEnabled && (
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="bg-gray-700 text-white rounded-md p-1 text-sm"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="ar">العربية</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
              </select>
            )}
            <button onClick={handleInviteGame} title="Play Tic-Tac-Toe" className="p-2 rounded-full hover:bg-gray-700"><Gamepad2 className="w-6 h-6 text-purple-500" /></button>
          </div>
        )}
      </header>
      {/* ... (rest of the chat JSX remains largely the same, without the GameOverlay) ... */}
       <div className={`flex-1 flex flex-col p-4 rounded-3xl shadow-xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="flex-1 overflow-y-auto mb-4 p-4 space-y-4 custom-scrollbar">
          {isLoading ? <div className="flex justify-center items-center h-full"><div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-blue-500"></div></div> : (
            <TransitionGroup>{messages.map((message) => <CSSTransition key={message.id} timeout={300} classNames="message-item"><div className={`message-item group flex items-end gap-2 relative ${message.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>{message.senderId !== user.uid && (<img src={SUPPORT_BOT_AVATAR} alt="Bot Avatar" className="w-8 h-8 rounded-full"/>)}<div className={`max-w-xs md:max-w-md p-3 rounded-xl shadow-md ${message.senderId === user.uid ? 'bg-blue-600 text-white' : (isChatWithBot ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-900') }`}>{!isChatWithBot && message.replyTo && <ReplyQuote msg={message.replyTo} />}{editingMessageId === message.id ? (<form onSubmit={handleUpdateMessage}><input type="text" value={editingText} onChange={(e) => setEditingText(e.target.value)} className="w-full bg-blue-700 text-white rounded p-1" autoFocus/><div className="flex justify-end space-x-2 mt-2"><button type="button" onClick={() => setEditingMessageId(null)} className="text-xs">Cancel</button><button type="submit" className="text-xs font-bold">Save</button></div></form>) : (message.type === 'image' ? <img src={message.file.url} alt={message.file.name} className="rounded-lg max-w-full h-auto" /> : message.type === 'file' ? <a href={message.file.url} target="_blank" rel="noopener noreferrer" className="flex items-center underline"><FileIcon className="me-2"/>{message.file.name}</a> : <DecryptedMessage message={message} />)}<span className={`block mt-1 text-xs ${message.senderId === user.uid ? 'text-blue-200' : 'text-gray-400'}`}>{message.createdAt?.seconds ? new Date(message.createdAt.seconds * 1000).toLocaleTimeString('ar-SA') : ''} {!isChatWithBot && message.isEdited && <i>(edited)</i>}</span></div></div></CSSTransition>)}</TransitionGroup>)}
          <div ref={messagesEndRef} />
        </div>
        <div className="h-5 text-sm text-gray-400 italic px-2">
          {isChatWithBot && isBotTyping && <p className="animate-pulse">Bot is typing...</p>}
          {!isChatWithBot && typingUsers.length > 0 && `${typingUsers.join(', ')} is typing...`}
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
