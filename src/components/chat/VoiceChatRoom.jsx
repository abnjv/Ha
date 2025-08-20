import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Mic, MicOff, PhoneCall, PhoneMissed, Send, MessageSquare, MoreHorizontal, Edit, Trash2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, addDoc, updateDoc, Timestamp, orderBy } from 'firebase/firestore';
import { getVoiceRoomParticipantsPath, getVoiceRoomMessagesPath, getVoiceRoomPath } from '../../constants';

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

const VoiceChatRoom = () => {
  const { user, userProfile, db, appId } = useAuth();
  const navigate = useNavigate();
  const { roomId } = useParams();

  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const localStreamRef = useRef(null);
  const audioContainerRef = useRef(null);
  const audioIntervalsRef = useRef({});
  const messagesEndRef = useRef(null);

  const [participants, setParticipants] = useState([]);
  const [uidSocketMap, setUidSocketMap] = useState({});
  const [speakingState, setSpeakingState] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [showOptionsForMessageId, setShowOptionsForMessageId] = useState(null);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);

  useEffect(() => { if (!db || !roomId) return; const q = query(collection(db, getVoiceRoomParticipantsPath(appId, roomId))); const unsub = onSnapshot(q, (snap) => setParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() })))); return unsub; }, [db, roomId, appId]);
  useEffect(() => { if (!db || !roomId) return; const q = query(collection(db, getVoiceRoomMessagesPath(appId, roomId)), orderBy('createdAt')); const unsub = onSnapshot(q, (snap) => { setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setIsLoadingMessages(false); }); return unsub; }, [db, roomId, appId]);
  useEffect(() => {
    if (!db || !roomId) return;
    const typingStatusPath = `${getVoiceRoomPath(appId, roomId)}/typing_status`;
    const q = query(collection(db, typingStatusPath));
    const unsub = onSnapshot(q, (snap) => {
        const now = Date.now();
        const typing = snap.docs.filter(doc => doc.id !== user.uid && (now - doc.data().lastTyped.toMillis()) < 3000).map(doc => doc.data().name);
        setTypingUsers(typing);
    });
    return unsub;
  }, [db, roomId, appId, user.uid]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SIGNALING_SERVER_URL || 'http://localhost:3001');
    socketRef.current = socket;
    socket.emit('join-room', roomId, user.uid);
    socket.on('user-joined', (newUserId, newSocketId) => createPeerConnection(newSocketId, true));
    socket.on('room-state', setUidSocketMap);
    socket.on('webrtc-offer', async ({ senderSocketId, sdp }) => { const pc = createPeerConnection(senderSocketId, false); await pc.setRemoteDescription(new RTCSessionDescription(sdp)); const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); socket.emit('webrtc-answer', { targetSocketId: senderSocketId, sdp: pc.localDescription }); });
    socket.on('webrtc-answer', async ({ senderSocketId, sdp }) => { await peerConnectionsRef.current[senderSocketId]?.setRemoteDescription(new RTCSessionDescription(sdp)); });
    socket.on('webrtc-ice-candidate', ({ senderSocketId, candidate }) => { peerConnectionsRef.current[senderSocketId]?.addIceCandidate(new RTCIceCandidate(candidate)); });
    socket.on('user-left', (socketId) => { peerConnectionsRef.current[socketId]?.close(); delete peerConnectionsRef.current[socketId]; clearInterval(audioIntervalsRef.current[socketId]); delete audioIntervalsRef.current[socketId]; setSpeakingState(p => { const n = {...p}; delete n[socketId]; return n; }); document.getElementById(socketId)?.remove(); });
    return () => { localStreamRef.current?.getTracks().forEach(t => t.stop()); Object.values(peerConnectionsRef.current).forEach(pc => pc.close()); Object.values(audioIntervalsRef.current).forEach(i => clearInterval(i)); socket.disconnect(); };
  }, [roomId, user.uid]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, showChat]);

  const createPeerConnection = (targetSocketId, isOfferor) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current[targetSocketId] = pc;
    localStreamRef.current?.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
    pc.onicecandidate = e => e.candidate && socketRef.current.emit('webrtc-ice-candidate', { targetSocketId, candidate: e.candidate });
    pc.ontrack = (event) => {
      let audioEl = document.getElementById(targetSocketId);
      if (!audioEl) { audioEl = document.createElement('audio'); audioEl.id = targetSocketId; audioEl.autoplay = true; audioContainerRef.current?.appendChild(audioEl); }
      audioEl.srcObject = event.streams[0];
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(event.streams[0]);
      source.connect(analyser);
      analyser.fftSize = 512;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      audioIntervalsRef.current[targetSocketId] = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setSpeakingState(p => ({ ...p, [targetSocketId]: avg > 15 }));
      }, 200);
    };
    if (isOfferor) pc.createOffer().then(o => pc.setLocalDescription(o)).then(() => socketRef.current.emit('webrtc-offer', { targetSocketId, sdp: pc.localDescription }));
    return pc;
  };

  const startVoiceChat = async () => {
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsJoined(true);
      await setDoc(doc(db, getVoiceRoomParticipantsPath(appId, roomId), user.uid), { name: userProfile.name, avatar: userProfile.avatar, uid: user.uid, joinedAt: serverTimestamp() });
    } catch (error) { console.error("Mic error:", error); }
  };

  const endVoiceChat = async () => {
    await deleteDoc(doc(db, getVoiceRoomParticipantsPath(appId, roomId), user.uid));
    socketRef.current.disconnect(); navigate('/dashboard');
  };

  const toggleMute = () => { if(localStreamRef.current) { localStreamRef.current.getAudioTracks()[0].enabled = !isMuted; setIsMuted(!isMuted); }};
  const updateTypingStatus = useCallback(debounce(async () => { if (!db || !roomId) return; const typingRef = doc(db, `${getVoiceRoomPath(appId, roomId)}/typing_status`, user.uid); await setDoc(typingRef, { name: userProfile.name, lastTyped: serverTimestamp() }); }, 500), [db, roomId, appId, user, userProfile]);
  const handleInputChange = (e) => { setInputMessage(e.target.value); updateTypingStatus(); };
  const handleSendMessage = async (e) => { e.preventDefault(); if (inputMessage.trim() === '') return; const msg = { senderId: user.uid, senderName: userProfile.name, text: inputMessage, createdAt: serverTimestamp(), isEdited: false, replyTo: replyingToMessage ? { id: replyingToMessage.id, text: replyingToMessage.text, senderName: replyingToMessage.senderName } : null }; await addDoc(collection(db, getVoiceRoomMessagesPath(appId, roomId)), msg); setInputMessage(''); setReplyingToMessage(null); };
  const handleDeleteMessage = async (msgId) => await deleteDoc(doc(db, getVoiceRoomMessagesPath(appId, roomId), msgId));
  const handleUpdateMessage = async (e) => { e.preventDefault(); if (editingText.trim() === '') return; await updateDoc(doc(db, getVoiceRoomMessagesPath(appId, roomId), editingMessageId), { text: editingText, isEdited: true, editedAt: Timestamp.now() }); setEditingMessageId(null); };
  const startEditing = (msg) => { setEditingMessageId(msg.id); setEditingText(msg.text); setShowOptionsForMessageId(null); };
  const startReplying = (msg) => { setReplyingToMessage(msg); setShowOptionsForMessageId(null); };
  const findSocketIdByUid = (uid) => uidSocketMap[uid] || null;
  const ReplyQuote = ({ msg }) => <div className="p-2 mb-1 text-xs bg-gray-600/50 rounded-lg"><p className="font-bold">{msg.senderName}</p><p className="opacity-80 truncate">{msg.text}</p></div>;

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <div className="flex-1 flex flex-col p-4">
        <header className="flex justify-between items-center mb-4"><h1 className="text-2xl font-bold">Room: {roomId}</h1><button onClick={() => navigate('/dashboard')} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600">Back</button></header>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 p-4 flex-wrap">
          {participants.map(p => <div key={p.id} className={`flex flex-col items-center p-2 rounded-lg transition-all duration-200 ${speakingState[findSocketIdByUid(p.id)] ? 'border-2 border-green-400 scale-110' : 'border-2 border-transparent'}`}><img src={p.avatar} alt={p.name} className="w-20 h-20 rounded-full mb-2" /><p className="font-semibold text-center text-sm">{p.name}</p></div>)}
        </div>
        <div className="flex-grow" />
        <div className="flex justify-center my-4 space-x-6">
            <button onClick={isJoined ? endVoiceChat : startVoiceChat} className={`p-4 rounded-full text-white shadow-lg ${isJoined ? 'bg-red-600' : 'bg-green-600'}`}>{isJoined ? <PhoneMissed /> : <PhoneCall />}</button>
            {isJoined && <button onClick={toggleMute} className={`p-4 rounded-full shadow-lg ${isMuted ? 'bg-gray-600' : 'bg-blue-600'}`}>{isMuted ? <MicOff /> : <Mic />}</button>}
            <button onClick={() => setShowChat(!showChat)} className="p-4 rounded-full bg-indigo-600 text-white shadow-lg"><MessageSquare /></button>
        </div>
      </div>
      <div className={`bg-gray-950 flex flex-col p-4 transition-all duration-300 ${showChat ? 'w-96' : 'w-0 p-0'}`} style={{ overflow: 'hidden' }}>
        <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Chat</h2><button onClick={() => setShowChat(false)}><X/></button></div>
        <div className="flex-1 overflow-y-auto mb-4 custom-scrollbar">
            {isLoadingMessages ? <div className="flex justify-center items-center h-full"><div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-blue-500"></div></div> : messages.map(message => (
                <div key={message.id} className={`group relative my-2 flex ${message.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                    <div className={`px-3 py-2 rounded-lg ${message.senderId === user.uid ? 'bg-blue-600' : 'bg-gray-700'}`}>
                        {message.replyTo && <ReplyQuote msg={message.replyTo} />}
                        {editingMessageId === message.id ? (
                             <form onSubmit={handleUpdateMessage}><input type="text" value={editingText} onChange={(e) => setEditingText(e.target.value)} className="w-full bg-blue-700 text-white rounded p-1" autoFocus/><div className="flex justify-end space-x-2 mt-1"><button type="button" onClick={() => setEditingMessageId(null)} className="text-xs">Cancel</button><button type="submit" className="text-xs font-bold">Save</button></div></form>
                        ) : <p className="text-sm">{message.text}</p>}
                         <p className="text-xs text-gray-400 mt-1">{message.senderName} {message.isEdited && <i>(edited)</i>}</p>
                    </div>
                     {message.senderId === user.uid && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100">
                            <button onClick={() => setShowOptionsForMessageId(showOptionsForMessageId === message.id ? null : message.id)} className="p-1 rounded-full hover:bg-gray-600"><MoreHorizontal size={14}/></button>
                            {showOptionsForMessageId === message.id && (
                                <div className="absolute left-full ml-1 w-28 bg-gray-800 rounded shadow-lg z-10 py-1">
                                    <button onClick={() => startReplying(message)} className="w-full text-left text-sm px-3 py-1.5 hover:bg-gray-700 flex items-center"><MessageSquare size={14} className="mr-2"/> Reply</button>
                                    <button onClick={() => startEditing(message)} className="w-full text-left text-sm px-3 py-1.5 hover:bg-gray-700 flex items-center"><Edit size={14} className="mr-2"/> Edit</button>
                                    <button onClick={() => handleDeleteMessage(message.id)} className="w-full text-left text-sm px-3 py-1.5 text-red-400 hover:bg-gray-700 flex items-center"><Trash2 size={14} className="mr-2"/> Delete</button>
                                </div>
                            )}
                        </div>
                     )}
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
        <div className="h-5 text-sm text-gray-400 italic px-2">
            {typingUsers.length > 0 && `${typingUsers.join(', ')} is typing...`}
        </div>
        <div className="border-t border-gray-700 pt-4">
            {replyingToMessage && <div className="p-2 mb-2 bg-gray-700 rounded-lg text-sm flex justify-between items-center"><div><p className="font-bold">Replying to {replyingToMessage.senderName}</p><p className="opacity-80 truncate">{replyingToMessage.text}</p></div><button onClick={() => setReplyingToMessage(null)} className="p-1"><X size={16}/></button></div>}
            <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input type="text" value={inputMessage} onChange={handleInputChange} placeholder="Send a message..." className="flex-1 p-2 rounded bg-gray-800 focus:outline-none"/>
                <button type="submit" className="p-2 rounded bg-blue-600"><Send/></button>
            </form>
        </div>
      </div>
      <div ref={audioContainerRef} />
    </div>
  );
};

export default VoiceChatRoom;
