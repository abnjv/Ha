import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CornerUpLeft, Send as SendIcon, MoreHorizontal, Edit, Trash2, MessageSquare, X, Paperclip, File as FileIcon, Gamepad2, Languages } from 'lucide-react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import io from 'socket.io-client';
import { ThemeContext } from '../../context/ThemeContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, Timestamp, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useAuth } from '../../context/AuthContext';
import { getPrivateChatMessagesPath, getPrivateChatsPath, SUPPORT_BOT_ID, SUPPORT_BOT_NAME, SUPPORT_BOT_AVATAR, getUserProfilePath } from '../../constants';
import { getBotResponse } from '../../bot/supportBot';
import ProfileModal from '../profile/ProfileModal';
import TicTacToeBoard from '../game/TicTacToeBoard';
import { createBoard, calculateWinner } from '../../game/ticTacToe';
import { get as getKey } from '../../utils/db';
import { importPublicKey, deriveSharedSecret, encryptMessage, decryptMessage, arrayBufferToBase64, base64ToArrayBuffer } from '../../utils/encryption';
import { translateText as translate } from '../../utils/translation';

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
  const [isTranslationEnabled, setIsTranslationEnabled] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('en');

  const [gameStatus, setGameStatus] = useState('inactive');
  const [invitation, setInvitation] = useState(null);
  const [board, setBoard] = useState(createBoard());
  const [playerSymbol, setPlayerSymbol] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState('X');
  const winner = calculateWinner(board);

  const socketRef = useRef();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const { isDarkMode, themeClasses } = useContext(ThemeContext);
  const chatPartnersId = useMemo(() => user && friendId ? [user.uid, friendId].sort().join('_') : null, [user, friendId]);
  const isChatWithBot = friendId === SUPPORT_BOT_ID;

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

  useEffect(() => {
    if (isChatWithBot) {
      setIsLoading(false);
      setMessages([{ id: 'initial-bot-message', senderId: SUPPORT_BOT_ID, text: 'Hello! I am the Support Bot. How can I help you today?', createdAt: { toDate: () => new Date() } }]);
      return;
    }

    socketRef.current = io(import.meta.env.VITE_SIGNALING_SERVER_URL);
    if (user?.uid) { socketRef.current.emit('register', user.uid); }
    socketRef.current.on('game:invite', ({ from, fromName }) => { setInvitation({ from, fromName }); setGameStatus('pending'); });
    socketRef.current.on('game:start', () => { setGameStatus('active'); setBoard(createBoard()); setCurrentPlayer('X'); setPlayerSymbol('O'); });
    socketRef.current.on('game:move', ({ board: newBoard }) => { setBoard(newBoard); setCurrentPlayer(prev => prev === 'X' ? 'O' : 'X'); });
    socketRef.current.on('game:reset', () => { setBoard(createBoard()); setCurrentPlayer('X'); setGameStatus('active'); });
    socketRef.current.on('game:leave', () => { setGameStatus('ended'); });
    return () => { socketRef.current.disconnect(); };
  }, [user.uid, isChatWithBot]);

  useEffect(() => {
    if (isChatWithBot || !db || !chatPartnersId) {
      if (!isChatWithBot) setIsLoading(false);
      return;
    };
    const q = query(collection(db, getPrivateChatMessagesPath(appId, chatPartnersId)), orderBy('createdAt'));
    const unsub = onSnapshot(q, (snap) => { setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setIsLoading(false); });
    return unsub;
  }, [db, appId, chatPartnersId, isChatWithBot]);

  useEffect(() => {
    if (isChatWithBot) return;
    const q = query(collection(db, `${getPrivateChatsPath(appId, chatPartnersId)}/typing_status`));
    const unsub = onSnapshot(q, (snap) => { const now = Date.now(); setTypingUsers(snap.docs.filter(d => d.id !== user.uid && (now - d.data().lastTyped.toMillis()) < 3000).map(d => d.data().name)); });
    return unsub;
  }, [db, appId, chatPartnersId, user.uid, isChatWithBot]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const updateTypingStatus = useCallback(debounce(async () => { if (isChatWithBot || !db || !chatPartnersId || !userProfile) return; await setDoc(doc(db, `${getPrivateChatsPath(appId, chatPartnersId)}/typing_status`, user.uid), { name: userProfile.name, lastTyped: serverTimestamp() }); }, 500), [db, chatPartnersId, userProfile, isChatWithBot]);
  const handleInputChange = (e) => { setInputMessage(e.target.value); if (!isChatWithBot) updateTypingStatus(); };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (inputMessage.trim() === '' || isSendingMessage) return;

    if (isChatWithBot) {
      setIsSendingMessage(true);
      const userMessage = { id: `user-${Date.now()}`, senderId: user.uid, text: inputMessage, createdAt: { toDate: () => new Date() } };
      setMessages(prev => [...prev, userMessage]);
      const botResponseText = getBotResponse(inputMessage);
      const botMessage = { id: `bot-${Date.now()}`, senderId: SUPPORT_BOT_ID, text: botResponseText, createdAt: { toDate: () => new Date() } };
      setTimeout(() => {
        setMessages(prev => [...prev, botMessage]);
        setIsSendingMessage(false);
      }, 500);
      setInputMessage('');
      setReplyingToMessage(null);
      return;
    }

    if (!sharedSecretKey) {
      alert("Encryption keys are not ready. Please wait a moment.");
      return;
    }

    setIsSendingMessage(true);

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
        isEdited: false,
        replyTo: replyingToMessage ? { id: replyingToMessage.id, text: replyingToMessage.text, senderId: replyingToMessage.senderId, senderName: messages.find(m => m.senderId === replyingToMessage.senderId)?.senderName || 'Unknown' } : null,
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
      console.error("Failed to send encrypted message:", error);
    } finally {
      setInputMessage('');
      setReplyingToMessage(null);
      setIsSendingMessage(false);
    }
  };

  const handleFileChange = (e) => { const file = e.target.files[0]; if (file) uploadFile(file); };
  const uploadFile = (file) => { if (!storage || !chatPartnersId) return; setUploadingFile(file); const storageRef = ref(storage, `chat_uploads/${chatPartnersId}/${Date.now()}_${file.name}`); const uploadTask = uploadBytesResumable(storageRef, file); uploadTask.on('state_changed', (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100), (error) => { console.error("Upload failed:", error); setUploadingFile(null); }, () => { getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => { const fileType = file.type.startsWith('image/') ? 'image' : 'file'; sendDbMessage({ type: fileType, file: { url: downloadURL, name: file.name, type: file.type } }); setUploadingFile(null); setUploadProgress(0); }); }); };
  const handleDeleteMessage = async (msgId) => await deleteDoc(doc(db, getPrivateChatMessagesPath(appId, chatPartnersId), msgId));
  const startEditing = (msg) => { setEditingMessageId(msg.id); setEditingText(msg.text); setShowOptionsForMessageId(null); };
  const handleUpdateMessage = async (e) => { e.preventDefault(); if (editingText.trim() === '') return; await updateDoc(doc(db, getPrivateChatMessagesPath(appId, chatPartnersId), editingMessageId), { text: editingText, isEdited: true, editedAt: Timestamp.now() }); setEditingMessageId(null); };
  const startReplying = (msg) => { setReplyingToMessage(msg); setShowOptionsForMessageId(null); };
  const ReplyQuote = ({ msg }) => <div className="p-2 mb-1 text-xs bg-gray-500/30 rounded-lg"><p className="font-bold">{msg.senderName}</p><p className="opacity-80 truncate">{msg.text}</p></div>;
  const handleInviteGame = () => { socketRef.current.emit('game:invite', { targetUserId: friendId, fromUserId: user.uid, fromName: userProfile.name }); setGameStatus('invited'); setPlayerSymbol('X'); };
  const handleAcceptGame = () => { socketRef.current.emit('game:accept', { targetSocketId: invitation.from }); setGameStatus('active'); setBoard(createBoard()); setCurrentPlayer('X'); setPlayerSymbol('O'); setInvitation(null); };
  const handleDeclineGame = () => { setInvitation(null); setGameStatus('inactive'); };
  const handlePlayMove = (index) => { if (board[index] || winner || currentPlayer !== playerSymbol) return; const newBoard = board.slice(); newBoard[index] = playerSymbol; setBoard(newBoard); setCurrentPlayer(playerSymbol === 'X' ? 'O' : 'X'); socketRef.current.emit('game:move', { targetUserId: friendId, board: newBoard }); };
  const handleResetGame = () => { socketRef.current.emit('game:reset', { targetUserId: friendId }); setBoard(createBoard()); setCurrentPlayer('X'); setGameStatus('active'); };
  const handleLeaveGame = () => { if (gameStatus === 'active') { socketRef.current.emit('game:leave', { targetUserId: friendId }); } setGameStatus('inactive'); setInvitation(null); };

  const DecryptedMessage = ({ message, isMyMessage }) => {
    const [decryptedText, setDecryptedText] = useState('...');
    const [decryptedTranslation, setDecryptedTranslation] = useState(null);
    const [showOriginal, setShowOriginal] = useState(false);

    const hasTranslation = message.translation && message.translation.content;
    const shouldTranslate = isTranslationEnabled && !isMyMessage && hasTranslation;

    useEffect(() => {
      const decrypt = async () => {
        if (message.type !== 'encrypted_text' || !sharedSecretKey || !message.content) {
          setDecryptedText(message.text || '[Cannot display message]');
          return;
        }

        try {
          const originalEncrypted = base64ToArrayBuffer(message.content.ct);
          const originalIv = base64ToArrayBuffer(message.content.iv);
          const originalDecrypted = await decryptMessage(originalEncrypted, originalIv, sharedSecretKey);
          setDecryptedText(originalDecrypted);

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

  const GameOverlay = () => (
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
      <div className="text-center p-6 rounded-lg bg-gray-900 shadow-2xl">
        {gameStatus === 'pending' && invitation && (<div><h2 className="text-xl font-bold mb-4">{invitation.fromName} has invited you to play!</h2><div className="flex justify-center space-x-4"><button onClick={handleAcceptGame} className="px-6 py-2 bg-green-600 rounded">Accept</button><button onClick={handleDeclineGame} className="px-6 py-2 bg-red-600 rounded">Decline</button></div></div>)}
        {gameStatus === 'invited' && (<h2 className="text-xl font-bold">Waiting for {friendName} to accept...</h2>)}
        {(gameStatus === 'active' || (gameStatus === 'ended' && winner)) && ( <> <h2 className="text-2xl font-bold mb-4">Tic-Tac-Toe</h2> <TicTacToeBoard squares={board} onPlay={handlePlayMove} /> <div className="mt-4 text-xl font-bold"> {winner ? (winner === 'draw' ? 'It\'s a Draw!' : `Winner: ${winner}`) : `Turn: ${currentPlayer}`} </div> <p className="text-sm text-gray-400">You are: {playerSymbol}</p> <button onClick={handleResetGame} className="mt-4 px-4 py-2 bg-blue-600 rounded">Play Again</button> </> )}
        {gameStatus === 'ended' && !winner && <h2 className="text-xl font-bold">Your opponent left the game.</h2>}
        <button onClick={handleLeaveGame} className="mt-4 ml-2 px-4 py-2 bg-gray-700 rounded">Close</button>
      </div>
    </div>
  );

  return (
    <div className={`relative flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      {(gameStatus !== 'inactive' && !isChatWithBot) && <GameOverlay />}
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
      <div className={`flex-1 flex flex-col p-4 rounded-3xl shadow-xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="flex-1 overflow-y-auto mb-4 p-4 space-y-4 custom-scrollbar">
          {isLoading ? <div className="flex justify-center items-center h-full"><div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-blue-500"></div></div> : (
            <TransitionGroup>{messages.map((message) => <CSSTransition key={message.id} timeout={300} classNames="message-item"><div className={`message-item group flex relative ${message.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>{!isChatWithBot && message.senderId === user.uid && (<div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100"><button onClick={() => setShowOptionsForMessageId(showOptionsForMessageId === message.id ? null : message.id)} className="p-1 rounded-full hover:bg-gray-700"><MoreHorizontal size={16} /></button>{showOptionsForMessageId === message.id && (<div className="absolute rtl:right-full ltr:left-full ms-2 w-28 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 py-1"><button onClick={() => startReplying(message)} className="w-full text-start text-sm px-3 py-1.5 hover:bg-gray-700 flex items-center"><MessageSquare size={14} className="me-2"/> Reply</button><button onClick={() => startEditing(message)} className="w-full text-start text-sm px-3 py-1.5 hover:bg-gray-700 flex items-center"><Edit size={14} className="me-2"/> Edit</button><button onClick={() => handleDeleteMessage(message.id)} className="w-full text-start text-sm px-3 py-1.5 text-red-500 hover:bg-gray-700 flex items-center"><Trash2 size={14} className="me-2"/> Delete</button></div>)}</div>)}<div className={`max-w-xs md:max-w-md p-3 rounded-xl shadow-md ${message.senderId === user.uid ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'}`}>{!isChatWithBot && message.replyTo && <ReplyQuote msg={message.replyTo} />}{editingMessageId === message.id ? (<form onSubmit={handleUpdateMessage}><input type="text" value={editingText} onChange={(e) => setEditingText(e.target.value)} className="w-full bg-blue-700 text-white rounded p-1" autoFocus/><div className="flex justify-end space-x-2 mt-2"><button type="button" onClick={() => setEditingMessageId(null)} className="text-xs">Cancel</button><button type="submit" className="text-xs font-bold">Save</button></div></form>) : (message.type === 'image' ? <img src={message.file.url} alt={message.file.name} className="rounded-lg max-w-full h-auto" /> : message.type === 'file' ? <a href={message.file.url} target="_blank" rel="noopener noreferrer" className="flex items-center underline"><FileIcon className="me-2"/>{message.file.name}</a> : <p>{message.text}</p>)}<span className={`block mt-1 text-xs ${message.senderId === user.uid ? 'text-blue-200' : 'text-gray-500'}`}>{message.createdAt?.seconds ? new Date(message.createdAt.seconds * 1000).toLocaleTimeString('ar-SA') : ''} {!isChatWithBot && message.isEdited && <i>(edited)</i>}</span></div></div></CSSTransition>)}</TransitionGroup>)}
          <div ref={messagesEndRef} />
        </div>
        {!isChatWithBot && <div className="h-5 text-sm text-gray-400 italic">{typingUsers.length > 0 && `${typingUsers.join(', ')} is typing...`}</div>}
        {uploadingFile && <div className="p-2 mb-2"><p className="text-sm">Uploading: {uploadingFile.name}</p><div className="w-full bg-gray-700 rounded-full h-2.5"><div className="bg-blue-600 h-2.5 rounded-full" style={{width: `${uploadProgress}%`}}></div></div></div>}
        <div className="border-t border-gray-700 pt-4">
            {!isChatWithBot && replyingToMessage && (<div className="p-2 mb-2 bg-gray-700 rounded-lg text-sm flex justify-between items-center"><div><p className="font-bold">Replying to {messages.find(m => m.senderId === replyingToMessage.senderId)?.senderName}</p><p className="opacity-80 truncate">{replyingToMessage.text}</p></div><button onClick={() => setReplyingToMessage(null)} className="p-1"><X size={16}/></button></div>)}
            <form onSubmit={handleSendMessage} className="flex items-center space-x-2 space-x-reverse">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" disabled={isChatWithBot}/>
                <button type="button" onClick={() => fileInputRef.current.click()} className="p-3 rounded-full bg-gray-700 hover:bg-gray-600" disabled={isChatWithBot}><Paperclip/></button>
                <input type="text" value={inputMessage} onChange={handleInputChange} placeholder={isChatWithBot ? "Ask the bot a question..." : "أرسل رسالة..."} className="flex-1 p-3 rounded-full bg-gray-700 text-white focus:outline-none"/>
                <button type="submit" disabled={isSendingMessage} className="p-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-700"><SendIcon/></button>
            </form>
        </div>
      </div>
      {isProfileModalOpen && <ProfileModal userId={friendId} onClose={() => setIsProfileModalOpen(false)} />}
    </div>
  );
};

export default PrivateChat;
