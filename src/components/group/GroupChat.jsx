import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CornerUpLeft, Send as SendIcon, MoreHorizontal, Edit, Trash2, MessageSquare, X, Paperclip, File as FileIcon, ShieldX, Video, VideoOff, Mic, MicOff, PhoneOff } from 'lucide-react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { ThemeContext } from '../../context/ThemeContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, Timestamp, deleteField } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useAuth } from '../../context/AuthContext';
import { getGroupPath, getGroupMessagesPath } from '../../constants';

const PeerVideo = ({ peer }) => {
  const ref = useRef();
  useEffect(() => {
    if (peer.stream) { ref.current.srcObject = peer.stream; }
  }, [peer.stream]);
  return <video ref={ref} autoPlay playsInline className="w-full h-full object-cover rounded-lg bg-gray-800" />;
};

const GroupChat = () => {
  const { user, userProfile, db, storage, appId, socket } = useAuth();
  const navigate = useNavigate();
  const { groupId } = useParams();

  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userRole, setUserRole] = useState('member');
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [inCall, setInCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [showOptionsForMessageId, setShowOptionsForMessageId] = useState(null);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(null);

  const peersRef = useRef({});
  const localVideoRef = useRef();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const { isDarkMode, themeClasses } = useContext(ThemeContext);
  const isAdmin = useMemo(() => userRole === 'admin' || userRole === 'owner', [userRole]);

  useEffect(() => {
    if (!db || !groupId || !user?.uid) return;
    const groupDocRef = doc(db, getGroupPath(appId, groupId));
    const unsub = onSnapshot(groupDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const groupData = docSnap.data();
        setGroup(groupData);
        if (groupData.members && groupData.members[user.uid]) { setUserRole(groupData.members[user.uid].role); } else { navigate('/'); }
      } else { navigate('/'); }
    });
    return unsub;
  }, [db, appId, groupId, navigate, user]);

  useEffect(() => {
    if (!db || !groupId) return;
    const q = query(collection(db, getGroupMessagesPath(appId, groupId)), orderBy('createdAt'));
    const unsub = onSnapshot(q, (snap) => { setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setIsLoading(false); });
    return unsub;
  }, [db, appId, groupId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!inCall || !user || !socket) return;

    socket.emit('join-room', groupId, user.uid);

    const handleRoomState = (roomState) => {
      const allUsers = roomState[groupId];
      if (!allUsers) return;
      Object.keys(allUsers).forEach(userId => {
        if (userId !== user.uid) {
          createPeer(allUsers[userId], user.uid, localStream);
        }
      });
    };

    const handleUserJoined = (userId, socketId) => createPeer(socketId, user.uid, localStream);
    const handleOffer = (data) => handleOffer(data.senderSocketId, data.sdp);
    const handleAnswer = (data) => handleAnswer(data.senderSocketId, data.sdp);
    const handleIceCandidate = (data) => handleIceCandidate(data.senderSocketId, data.candidate);
    const handleUserLeft = (socketId) => {
      const peerIdToRemove = Object.keys(peersRef.current).find(key => peersRef.current[key].socketId === socketId);
      if (peerIdToRemove) {
        peersRef.current[peerIdToRemove].destroy();
        delete peersRef.current[peerIdToRemove];
        setPeers(prev => prev.filter(p => p.socketId !== socketId));
      }
    };

    socket.on('room-state', handleRoomState);
    socket.on('user-joined', handleUserJoined);
    socket.on('webrtc-offer', handleOffer);
    socket.on('webrtc-answer', handleAnswer);
    socket.on('webrtc-ice-candidate', handleIceCandidate);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.off('room-state', handleRoomState);
      socket.off('user-joined', handleUserJoined);
      socket.off('webrtc-offer', handleOffer);
      socket.off('webrtc-answer', handleAnswer);
      socket.off('webrtc-ice-candidate', handleIceCandidate);
      socket.off('user-left', handleUserLeft);

      // We don't disconnect the shared socket here
      localStream?.getTracks().forEach(track => track.stop());
      Object.values(peersRef.current).forEach(peer => peer.destroy());
    };
  }, [inCall, user, groupId, localStream, socket]);

  function createPeer(targetSocketId, senderUserId, stream) {
    const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peersRef.current[targetSocketId] = peer;
    stream.getTracks().forEach(track => peer.addTrack(track, stream));
    peer.onicecandidate = event => { if (event.candidate) { socket.emit('webrtc-ice-candidate', { targetSocketId, candidate: event.candidate }); } };
    peer.ontrack = event => { setPeers(prev => prev.find(p => p.socketId === targetSocketId) ? prev : [...prev, { socketId: targetSocketId, stream: event.streams[0] }]); };
    peer.createOffer().then(offer => peer.setLocalDescription(offer)).then(() => { socket.emit('webrtc-offer', { targetSocketId, sdp: peer.localDescription }); });
    return peer;
  }

  function handleOffer(senderSocketId, sdp) {
    const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peersRef.current[senderSocketId] = peer;
    localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
    peer.setRemoteDescription(sdp).then(() => { peer.createAnswer().then(answer => peer.setLocalDescription(answer)).then(() => { socket.emit('webrtc-answer', { targetSocketId: senderSocketId, sdp: peer.localDescription }); }); });
    peer.onicecandidate = event => { if (event.candidate) { socket.emit('webrtc-ice-candidate', { targetSocketId: senderSocketId, candidate: event.candidate }); } };
    peer.ontrack = event => { setPeers(prev => prev.find(p => p.socketId === senderSocketId) ? prev : [...prev, { socketId: senderSocketId, stream: event.streams[0] }]); };
  }

  function handleAnswer(senderSocketId, sdp) { peersRef.current[senderSocketId]?.setRemoteDescription(sdp); }
  function handleIceCandidate(senderSocketId, candidate) { peersRef.current[senderSocketId]?.addIceCandidate(new RTCIceCandidate(candidate)); }

  const handleJoinCall = () => { navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => { setLocalStream(stream); if(localVideoRef.current) localVideoRef.current.srcObject = stream; setInCall(true); }).catch(err => console.error("Error getting media stream:", err)); };
  const handleLeaveCall = () => { setInCall(false); };
  const toggleMute = () => { if (localStream) { localStream.getAudioTracks()[0].enabled = !isMuted; setIsMuted(!isMuted); } };
  const toggleVideo = () => { if (localStream) { localStream.getVideoTracks()[0].enabled = !isVideoEnabled; setIsVideoEnabled(!isVideoEnabled); } };

  const sendDbMessage = async (messageData) => { if (!userProfile) return; const finalMessage = { ...messageData, senderId: user.uid, senderName: userProfile.name, senderAvatar: userProfile.avatar, createdAt: serverTimestamp(), isEdited: false, replyTo: replyingToMessage ? { id: replyingToMessage.id, text: replyingToMessage.text, senderId: replyingToMessage.senderId, senderName: replyingToMessage.senderName } : null }; await addDoc(collection(db, getGroupMessagesPath(appId, groupId)), finalMessage); setReplyingToMessage(null); };
  const handleSendMessage = async (e) => { e.preventDefault(); if (inputMessage.trim() === '' || isSendingMessage) return; setIsSendingMessage(true); await sendDbMessage({ type: 'text', text: inputMessage }); setInputMessage(''); setIsSendingMessage(false); };
  const handleFileChange = (e) => { const file = e.target.files[0]; if (file) uploadFile(file); };
  const uploadFile = (file) => { if (!storage || !groupId) return; setUploadingFile(file); const storageRef = ref(storage, `group_chat_uploads/${groupId}/${Date.now()}_${file.name}`); const uploadTask = uploadBytesResumable(storageRef, file); uploadTask.on('state_changed', (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100), (error) => { console.error("Upload failed:", error); setUploadingFile(null); }, () => { getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => { const fileType = file.type.startsWith('image/') ? 'image' : 'file'; sendDbMessage({ type: fileType, file: { url: downloadURL, name: file.name, type: file.type } }); setUploadingFile(null); setUploadProgress(0); }); }); };
  const handleDeleteMessage = async (msgId) => await deleteDoc(doc(db, getGroupMessagesPath(appId, groupId), msgId));
  const startEditing = (msg) => { setEditingMessageId(msg.id); setEditingText(msg.text); setShowOptionsForMessageId(null); };
  const handleUpdateMessage = async (e) => { e.preventDefault(); if (editingText.trim() === '') return; await updateDoc(doc(db, getGroupMessagesPath(appId, groupId), editingMessageId), { text: editingText, isEdited: true, editedAt: Timestamp.now() }); setEditingMessageId(null); };
  const startReplying = (msg) => { setReplyingToMessage(msg); setShowOptionsForMessageId(null); };
  const handleBanUser = async (userIdToBan) => { if (!isAdmin) return; const groupDocRef = doc(db, getGroupPath(appId, groupId)); try { await updateDoc(groupDocRef, { [`members.${userIdToBan}`]: deleteField() }); setShowUserMenu(null); } catch (error) { console.error("Error banning user:", error); } };
  const ReplyQuote = ({ msg }) => <div className="p-2 mb-1 text-xs bg-gray-500/30 rounded-lg"><p className="font-bold">{msg.senderName}</p><p className="opacity-80 truncate">{msg.text}</p></div>;

  return (
    <div className={`flex h-screen antialiased ${themeClasses}`}>
      <div className={`flex flex-col w-full ${inCall ? 'md:w-2/3' : 'w-full'} transition-all duration-300`}>
        <header className={`flex items-center space-x-4 p-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'} border-b border-gray-700 flex-shrink-0`}>
          <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-gray-700"><CornerUpLeft/></button>
          <span className="text-xl font-extrabold flex-1">{group?.name || 'Group Chat'}</span>
          <button onClick={inCall ? handleLeaveCall : handleJoinCall} className={`p-2 rounded-full ${inCall ? 'bg-red-600' : 'bg-green-600'}`}>
            {inCall ? <PhoneOff className="text-white" /> : <Video className="text-white" />}
          </button>
        </header>
        <div className={`flex-1 flex flex-col p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} overflow-y-hidden`}>
          <div className="flex-1 overflow-y-auto mb-4 p-4 space-y-4 custom-scrollbar">
            {isLoading ? <div className="flex justify-center items-center h-full"><div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-blue-500"></div></div> : (
              <TransitionGroup>{messages.map((message) => <CSSTransition key={message.id} timeout={300} classNames="message-item"><div className={`message-item group flex flex-col ${message.senderId === user.uid ? 'items-end' : 'items-start'}`}>{message.senderId !== user.uid && <div className="relative"><button onClick={() => setShowUserMenu({ userId: message.senderId, userName: message.senderName })} className="text-xs text-gray-400 ml-3 mb-1 hover:underline">{message.senderName}</button>{showUserMenu?.userId === message.senderId && (<div className="absolute bottom-full mb-2 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 py-1">{isAdmin && <button onClick={() => handleBanUser(message.senderId)} className="w-full text-left text-sm px-3 py-1.5 text-red-500 hover:bg-gray-700 flex items-center"><ShieldX size={14} className="mr-2"/> Ban {showUserMenu.userName}</button>}<button onClick={() => setShowUserMenu(null)} className="w-full text-left text-sm px-3 py-1.5 hover:bg-gray-700">Dismiss</button></div>)}</div>}<div className={`flex relative ${message.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>{ (isAdmin || message.senderId === user.uid) && (<div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100"><button onClick={() => setShowOptionsForMessageId(showOptionsForMessageId === message.id ? null : message.id)} className="p-1 rounded-full hover:bg-gray-700"><MoreHorizontal size={16} /></button>{showOptionsForMessageId === message.id && (<div className="absolute left-full ml-2 w-28 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 py-1"><button onClick={() => startReplying(message)} className="w-full text-left text-sm px-3 py-1.5 hover:bg-gray-700 flex items-center"><MessageSquare size={14} className="mr-2"/> Reply</button>{ (message.senderId === user.uid) && <button onClick={() => startEditing(message)} className="w-full text-left text-sm px-3 py-1.5 hover:bg-gray-700 flex items-center"><Edit size={14} className="mr-2"/> Edit</button>}{ (isAdmin || message.senderId === user.uid) && <button onClick={() => handleDeleteMessage(message.id)} className="w-full text-left text-sm px-3 py-1.5 text-red-500 hover:bg-gray-700 flex items-center"><Trash2 size={14} className="mr-2"/> Delete</button>}</div>)}</div>)}<div className={`max-w-xs md:max-w-md p-3 rounded-xl shadow-md ${message.senderId === user.uid ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'}`}>{message.replyTo && <ReplyQuote msg={message.replyTo} />}{editingMessageId === message.id ? (<form onSubmit={handleUpdateMessage}><input type="text" value={editingText} onChange={(e) => setEditingText(e.target.value)} className="w-full bg-blue-700 text-white rounded p-1" autoFocus/><div className="flex justify-end space-x-2 mt-2"><button type="button" onClick={() => setEditingMessageId(null)} className="text-xs">Cancel</button><button type="submit" className="text-xs font-bold">Save</button></div></form>) : (message.type === 'image' ? <img src={message.file.url} alt={message.file.name} className="rounded-lg max-w-full h-auto" /> : message.type === 'file' ? <a href={message.file.url} target="_blank" rel="noopener noreferrer" className="flex items-center underline"><FileIcon className="mr-2"/>{message.file.name}</a> : <p>{message.text}</p>)}<span className={`block mt-1 text-xs ${message.senderId === user.uid ? 'text-blue-200' : 'text-gray-500'}`}>{message.createdAt?.seconds ? new Date(message.createdAt.seconds * 1000).toLocaleTimeString('ar-SA') : ''} {message.isEdited && <i>(edited)</i>}</span></div></div></div></CSSTransition>)}</TransitionGroup>)}
            <div ref={messagesEndRef} />
          </div>
          <div className="border-t border-gray-700 pt-4">
            {replyingToMessage && (<div className="p-2 mb-2 bg-gray-700 rounded-lg text-sm flex justify-between items-center"><div><p className="font-bold">Replying to {replyingToMessage.senderName}</p><p className="opacity-80 truncate">{replyingToMessage.text}</p></div><button onClick={() => setReplyingToMessage(null)} className="p-1"><X size={16}/></button></div>)}
            <form onSubmit={handleSendMessage} className="flex items-center space-x-2 space-x-reverse">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current.click()} className="p-3 rounded-full bg-gray-700 hover:bg-gray-600"><Paperclip/></button>
              <input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} placeholder="أرسل رسالة..." className="flex-1 p-3 rounded-full bg-gray-700 text-white focus:outline-none"/>
              <button type="submit" disabled={isSendingMessage || uploadingFile} className="p-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-700"><SendIcon/></button>
            </form>
          </div>
        </div>
      </div>
      {inCall && (
        <div className="hidden md:flex flex-col w-1/3 bg-gray-950 border-l border-gray-800 p-4">
          <div className="flex-1 grid grid-cols-1 grid-rows-4 gap-4">
            <div className="relative row-span-1">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover rounded-lg bg-gray-800" />
              <span className="absolute bottom-2 left-2 text-white bg-black/50 px-2 py-1 rounded text-sm">{userProfile?.name} (You)</span>
            </div>
            {peers.map(peer => (
              <div key={peer.socketId} className="relative row-span-1">
                <PeerVideo peer={peer} />
              </div>
            ))}
          </div>
          <div className="flex justify-center items-center space-x-4 p-4 mt-4 bg-gray-900 rounded-xl">
            <button onClick={toggleMute} className="p-3 rounded-full bg-gray-700 hover:bg-gray-600">
              {isMuted ? <MicOff className="text-white" /> : <Mic className="text-white" />}
            </button>
            <button onClick={toggleVideo} className="p-3 rounded-full bg-gray-700 hover:bg-gray-600">
              {isVideoEnabled ? <Video className="text-white" /> : <VideoOff className="text-white" />}
            </button>
            <button onClick={handleLeaveCall} className="p-3 rounded-full bg-red-600 hover:bg-red-700">
              <PhoneOff className="text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupChat;
