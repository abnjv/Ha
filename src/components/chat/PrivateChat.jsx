import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CornerUpLeft, Send as SendIcon, MoreHorizontal, Edit, Trash2, MessageSquare, X, Paperclip, File as FileIcon } from 'lucide-react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { ThemeContext } from '../../context/ThemeContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, Timestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useAuth } from '../../context/AuthContext';
import { getPrivateChatMessagesPath, getPrivateChatsPath } from '../../constants';

const debounce = (func, delay) => { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func(...args), delay); }; };

const PrivateChat = () => {
  const { user, db, storage, appId } = useAuth();
  const navigate = useNavigate();
  const { friendId, friendName } = useParams();

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(null); // To store file being uploaded
  const [uploadProgress, setUploadProgress] = useState(0);

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [showOptionsForMessageId, setShowOptionsForMessageId] = useState(null);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const { isDarkMode, themeClasses } = useContext(ThemeContext);

  const chatPartnersId = useMemo(() => user && friendId ? [user.uid, friendId].sort().join('_') : null, [user, friendId]);

  useEffect(() => { if (!db || !chatPartnersId) return; const q = query(collection(db, getPrivateChatMessagesPath(appId, chatPartnersId)), orderBy('createdAt')); const unsub = onSnapshot(q, (snap) => { setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setIsLoading(false); }); return unsub; }, [db, appId, chatPartnersId]);
  useEffect(() => { if (!db || !chatPartnersId) return; const q = query(collection(db, `${getPrivateChatsPath(appId, chatPartnersId)}/typing_status`)); const unsub = onSnapshot(q, (snap) => { const now = Date.now(); setTypingUsers(snap.docs.filter(d => d.id !== user.uid && (now - d.data().lastTyped.toMillis()) < 3000).map(d => d.data().name)); }); return unsub; }, [db, appId, chatPartnersId, user.uid]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const updateTypingStatus = useCallback(debounce(async () => { if (!db || !chatPartnersId) return; await setDoc(doc(db, `${getPrivateChatsPath(appId, chatPartnersId)}/typing_status`, user.uid), { name: user.displayName, lastTyped: serverTimestamp() }); }, 500), [db, chatPartnersId, user]);
  const handleInputChange = (e) => { setInputMessage(e.target.value); updateTypingStatus(); };

  const sendDbMessage = async (messageData) => {
    const finalMessage = { ...messageData, senderId: user.uid, createdAt: serverTimestamp(), isEdited: false, replyTo: replyingToMessage ? { id: replyingToMessage.id, text: replyingToMessage.text, senderId: replyingToMessage.senderId, senderName: messages.find(m => m.senderId === replyingToMessage.senderId)?.senderName || 'Unknown' } : null };
    await addDoc(collection(db, getPrivateChatMessagesPath(appId, chatPartnersId)), finalMessage);
    setReplyingToMessage(null);
  };

  const handleSendMessage = async (e) => { e.preventDefault(); if (inputMessage.trim() === '' || isSendingMessage) return; setIsSendingMessage(true); await sendDbMessage({ type: 'text', text: inputMessage }); setInputMessage(''); setIsSendingMessage(false); };
  const handleFileChange = (e) => { const file = e.target.files[0]; if (file) uploadFile(file); };

  const uploadFile = (file) => {
    if (!storage || !chatPartnersId) return;
    setUploadingFile(file);
    const storageRef = ref(storage, `chat_uploads/${chatPartnersId}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTask.on('state_changed', (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100), (error) => { console.error("Upload failed:", error); setUploadingFile(null); }, () => {
      getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
        const fileType = file.type.startsWith('image/') ? 'image' : 'file';
        sendDbMessage({ type: fileType, file: { url: downloadURL, name: file.name, type: file.type } });
        setUploadingFile(null);
        setUploadProgress(0);
      });
    });
  };

  const handleDeleteMessage = async (msgId) => await deleteDoc(doc(db, getPrivateChatMessagesPath(appId, chatPartnersId), msgId));
  const startEditing = (msg) => { setEditingMessageId(msg.id); setEditingText(msg.text); setShowOptionsForMessageId(null); };
  const handleUpdateMessage = async (e) => { e.preventDefault(); if (editingText.trim() === '') return; await updateDoc(doc(db, getPrivateChatMessagesPath(appId, chatPartnersId), editingMessageId), { text: editingText, isEdited: true, editedAt: Timestamp.now() }); setEditingMessageId(null); };
  const startReplying = (msg) => { setReplyingToMessage(msg); setShowOptionsForMessageId(null); };
  const ReplyQuote = ({ msg }) => <div className="p-2 mb-1 text-xs bg-gray-500/30 rounded-lg"><p className="font-bold">{msg.senderName}</p><p className="opacity-80 truncate">{msg.text}</p></div>;

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}><button onClick={() => navigate('/private-chat-list')} className="p-2 rounded-full hover:bg-gray-700"><CornerUpLeft/></button><span className="text-2xl font-extrabold flex-1">{friendName}</span></header>
      <div className={`flex-1 flex flex-col p-4 rounded-3xl shadow-xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="flex-1 overflow-y-auto mb-4 p-4 space-y-4 custom-scrollbar">
          {isLoading ? <div className="flex justify-center items-center h-full"><div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-blue-500"></div></div> : (
            <TransitionGroup>{messages.map((message) => <CSSTransition key={message.id} timeout={300} classNames="message-item"><div className={`message-item group flex relative ${message.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>{message.senderId === user.uid && (<div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100"><button onClick={() => setShowOptionsForMessageId(showOptionsForMessageId === message.id ? null : message.id)} className="p-1 rounded-full hover:bg-gray-700"><MoreHorizontal size={16} /></button>{showOptionsForMessageId === message.id && (<div className="absolute left-full ml-2 w-28 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 py-1"><button onClick={() => startReplying(message)} className="w-full text-left text-sm px-3 py-1.5 hover:bg-gray-700 flex items-center"><MessageSquare size={14} className="mr-2"/> Reply</button><button onClick={() => startEditing(message)} className="w-full text-left text-sm px-3 py-1.5 hover:bg-gray-700 flex items-center"><Edit size={14} className="mr-2"/> Edit</button><button onClick={() => handleDeleteMessage(message.id)} className="w-full text-left text-sm px-3 py-1.5 text-red-500 hover:bg-gray-700 flex items-center"><Trash2 size={14} className="mr-2"/> Delete</button></div>)}</div>)}<div className={`max-w-xs md:max-w-md p-3 rounded-xl shadow-md ${message.senderId === user.uid ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'}`}>{message.replyTo && <ReplyQuote msg={message.replyTo} />}{editingMessageId === message.id ? (<form onSubmit={handleUpdateMessage}><input type="text" value={editingText} onChange={(e) => setEditingText(e.target.value)} className="w-full bg-blue-700 text-white rounded p-1" autoFocus/><div className="flex justify-end space-x-2 mt-2"><button type="button" onClick={() => setEditingMessageId(null)} className="text-xs">Cancel</button><button type="submit" className="text-xs font-bold">Save</button></div></form>) : (message.type === 'image' ? <img src={message.file.url} alt={message.file.name} className="rounded-lg max-w-full h-auto" /> : message.type === 'file' ? <a href={message.file.url} target="_blank" rel="noopener noreferrer" className="flex items-center underline"><FileIcon className="mr-2"/>{message.file.name}</a> : <p>{message.text}</p>)}<span className={`block mt-1 text-xs ${message.senderId === user.uid ? 'text-blue-200' : 'text-gray-500'}`}>{message.createdAt?.seconds ? new Date(message.createdAt.seconds * 1000).toLocaleTimeString('ar-SA') : ''} {message.isEdited && <i>(edited)</i>}</span></div></div></CSSTransition>)}</TransitionGroup>)}
          <div ref={messagesEndRef} />
        </div>
        <div className="h-5 text-sm text-gray-400 italic">{typingUsers.length > 0 && `${typingUsers.join(', ')} is typing...`}</div>
        {uploadingFile && <div className="p-2 mb-2"><p className="text-sm">Uploading: {uploadingFile.name}</p><div className="w-full bg-gray-700 rounded-full h-2.5"><div className="bg-blue-600 h-2.5 rounded-full" style={{width: `${uploadProgress}%`}}></div></div></div>}
        <div className="border-t border-gray-700 pt-4">
            {replyingToMessage && (<div className="p-2 mb-2 bg-gray-700 rounded-lg text-sm flex justify-between items-center"><div><p className="font-bold">Replying to {messages.find(m => m.senderId === replyingToMessage.senderId)?.senderName}</p><p className="opacity-80 truncate">{replyingToMessage.text}</p></div><button onClick={() => setReplyingToMessage(null)} className="p-1"><X size={16}/></button></div>)}
            <form onSubmit={handleSendMessage} className="flex items-center space-x-2 space-x-reverse">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current.click()} className="p-3 rounded-full bg-gray-700 hover:bg-gray-600"><Paperclip/></button>
                <input type="text" value={inputMessage} onChange={handleInputChange} placeholder="أرسل رسالة..." className="flex-1 p-3 rounded-full bg-gray-700 text-white focus:outline-none"/>
                <button type="submit" disabled={isSendingMessage || uploadingFile} className="p-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-700"><SendIcon/></button>
            </form>
        </div>
      </div>
    </div>
  );
};

export default PrivateChat;
