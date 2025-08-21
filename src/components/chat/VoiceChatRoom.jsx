import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Mic, MicOff, PhoneCall, PhoneMissed, Send, MessageSquare, MoreHorizontal, Edit, Trash2, X, Paperclip, File as FileIcon, Video, VideoOff, Circle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, addDoc, updateDoc, Timestamp, orderBy, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getVoiceRoomParticipantsPath, getVoiceRoomMessagesPath, getVoiceRoomPath } from '../../constants';

const debounce = (func, delay) => { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func(...args), delay); }; };

const VoiceChatRoom = () => {
  const { user, userProfile, db, storage, appId } = useAuth();
  const navigate = useNavigate();
  const { roomId } = useParams();

  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const localStreamRef = useRef(null);
  const audioContainerRef = useRef(null);
  const audioIntervalsRef = useRef({});
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const [participants, setParticipants] = useState([]);
  const [uidSocketMap, setUidSocketMap] = useState({});
  const [speakingState, setSpeakingState] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [showOptionsForMessageId, setShowOptionsForMessageId] = useState(null);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [roomBackground, setRoomBackground] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUploadProgress, setRecordingUploadProgress] = useState(null);

  // Fetch equipped background from user's profile
  useEffect(() => {
    const fetchBackground = async () => {
      if (userProfile?.equippedItems?.background) {
        const bgId = userProfile.equippedItems.background;
        try {
          const itemDocRef = doc(db, `apps/${appId}/virtualItems`, bgId);
          const itemDoc = await getDoc(itemDocRef);
          if (itemDoc.exists() && itemDoc.data().imageUrl) {
            setRoomBackground(itemDoc.data().imageUrl);
          }
        } catch (e) {
            console.error("Could not fetch background", e)
        }
      }
    };
    fetchBackground();
  }, [userProfile, db, appId]);

  const createPeerConnection = useCallback((targetSocketId, isOfferor) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peerConnectionsRef.current[targetSocketId] = pc;
    localStreamRef.current?.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
    pc.onicecandidate = e => e.candidate && socketRef.current.emit('webrtc-ice-candidate', { targetSocketId, candidate: e.candidate });
    pc.ontrack = (event) => {
      setRemoteStreams(prev => ({
        ...prev,
        [targetSocketId]: event.streams[0]
      }));

      const audioStream = event.streams[0];
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(audioStream);
      source.connect(analyser);
      analyser.fftSize = 512;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      audioIntervalsRef.current[targetSocketId] = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setSpeakingState(p => ({ ...p, [targetSocketId]: avg > 15 }));
      }, 200);
    };
    if (isOfferor) {
        pc.createOffer()
        .then(o => pc.setLocalDescription(o))
        .then(() => socketRef.current.emit('webrtc-offer', { targetSocketId, sdp: pc.localDescription }));
    }
    return pc;
  }, []);

  useEffect(() => { if (!db || !roomId) return; const q = query(collection(db, getVoiceRoomParticipantsPath(appId, roomId))); const unsub = onSnapshot(q, (snap) => setParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() })))); return unsub; }, [db, roomId, appId]);
  useEffect(() => { if (!db || !roomId) return; const q = query(collection(db, getVoiceRoomMessagesPath(appId, roomId)), orderBy('createdAt')); const unsub = onSnapshot(q, (snap) => { setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setIsLoadingMessages(false); }); return unsub; }, [db, roomId, appId]);
  useEffect(() => { if (!db || !roomId) return; const typingStatusPath = `${getVoiceRoomPath(appId, roomId)}/typing_status`; const q = query(collection(db, typingStatusPath)); const unsub = onSnapshot(q, (snap) => { const now = Date.now(); setTypingUsers(snap.docs.filter(d => d.id !== user.uid && (now - d.data().lastTyped.toMillis()) < 3000).map(d => d.data().name)); }); return unsub; }, [db, roomId, appId, user.uid]);
  useEffect(() => { const socket = io(import.meta.env.VITE_SIGNALING_SERVER_URL || 'http://localhost:3001'); socketRef.current = socket; socket.emit('join-room', roomId, user.uid); socket.on('user-joined', (newUserId, newSocketId) => createPeerConnection(newSocketId, true)); socket.on('room-state', setUidSocketMap); socket.on('webrtc-offer', async ({ senderSocketId, sdp }) => { const pc = createPeerConnection(senderSocketId, false); await pc.setRemoteDescription(new RTCSessionDescription(sdp)); const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); socket.emit('webrtc-answer', { targetSocketId: senderSocketId, sdp: pc.localDescription }); }); socket.on('webrtc-answer', async ({ senderSocketId, sdp }) => { await peerConnectionsRef.current[senderSocketId]?.setRemoteDescription(new RTCSessionDescription(sdp)); }); socket.on('webrtc-ice-candidate', ({ senderSocketId, candidate }) => { peerConnectionsRef.current[senderSocketId]?.addIceCandidate(new RTCIceCandidate(candidate)); }); socket.on('user-left', (socketId) => { peerConnectionsRef.current[socketId]?.close(); delete peerConnectionsRef.current[socketId]; clearInterval(audioIntervalsRef.current[socketId]); delete audioIntervalsRef.current[socketId]; setSpeakingState(p => { const n = {...p}; delete n[socketId]; return n; }); setRemoteStreams(p => { const n = {...p}; delete n[socketId]; return n; }); document.getElementById(socketId)?.remove(); }); return () => { localStreamRef.current?.getTracks().forEach(t => t.stop()); Object.values(peerConnectionsRef.current).forEach(pc => pc.close()); Object.values(audioIntervalsRef.current).forEach(i => clearInterval(i)); socket.disconnect(); }; }, [roomId, user.uid, createPeerConnection]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const joinRoom = async () => {
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setIsVideoEnabled(true);
      setIsJoined(true);
      await setDoc(doc(db, getVoiceRoomParticipantsPath(appId, roomId), user.uid), { name: userProfile.name, avatar: userProfile.avatar, uid: user.uid, joinedAt: serverTimestamp() });
    } catch (error) {
      console.error("Mic/Camera error, falling back to audio only:", error);
      try {
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsVideoEnabled(false);
        setIsJoined(true);
        await setDoc(doc(db, getVoiceRoomParticipantsPath(appId, roomId), user.uid), { name: userProfile.name, avatar: userProfile.avatar, uid: user.uid, joinedAt: serverTimestamp() });
      } catch (audioError) {
        console.error("Audio-only fallback error:", audioError);
        alert("Could not get microphone access. Please check permissions.");
      }
    }
  };
  const endVoiceChat = async () => { await deleteDoc(doc(db, getVoiceRoomParticipantsPath(appId, roomId), user.uid)); socketRef.current.disconnect(); navigate('/dashboard'); };
  const toggleMute = () => { if(localStreamRef.current) { const audioTrack = localStreamRef.current.getAudioTracks()[0]; audioTrack.enabled = !isMuted; setIsMuted(!isMuted); }};
  const sendDbMessage = async (messageData) => { const finalMessage = { ...messageData, senderId: user.uid, senderName: userProfile.name, createdAt: serverTimestamp(), isEdited: false, replyTo: replyingToMessage ? { id: replyingToMessage.id, text: replyingToMessage.text, senderName: replyingToMessage.senderName } : null }; await addDoc(collection(db, getVoiceRoomMessagesPath(appId, roomId)), finalMessage); setReplyingToMessage(null); };
  const handleSendMessage = async (e) => { e.preventDefault(); if (inputMessage.trim() === '') return; await sendDbMessage({ type: 'text', text: inputMessage }); setInputMessage(''); };
  const handleFileChange = (e) => { const file = e.target.files[0]; if (file) uploadFile(file); };
  const uploadFile = (file) => { if (!storage || !roomId) return; setUploadingFile(file); const storageRef = ref(storage, `room_uploads/${roomId}/${Date.now()}_${file.name}`); const uploadTask = uploadBytesResumable(storageRef, file); uploadTask.on('state_changed', (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100), (error) => { console.error("Upload failed:", error); setUploadingFile(null); }, () => { getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => { const fileType = file.type.startsWith('image/') ? 'image' : 'file'; sendDbMessage({ type: fileType, file: { url: downloadURL, name: file.name, type: file.type } }); setUploadingFile(null); setUploadProgress(0); }); }); };
  const updateTypingStatus = useCallback(debounce(async () => { if (!db || !roomId) return; const typingRef = doc(db, `${getVoiceRoomPath(appId, roomId)}/typing_status`, user.uid); await setDoc(typingRef, { name: userProfile.name, lastTyped: serverTimestamp() }); }, 500), [db, roomId, appId, user, userProfile]);
  const handleInputChange = (e) => { setInputMessage(e.target.value); updateTypingStatus(); };
  const handleDeleteMessage = async (msgId) => await deleteDoc(doc(db, getVoiceRoomMessagesPath(appId, roomId), msgId));
  const handleUpdateMessage = async (e) => { e.preventDefault(); if (editingText.trim() === '') return; await updateDoc(doc(db, getVoiceRoomMessagesPath(appId, roomId), editingMessageId), { text: editingText, isEdited: true, editedAt: Timestamp.now() }); setEditingMessageId(null); setEditingText(''); };
  const startEditing = (msg) => { setEditingMessageId(msg.id); setEditingText(msg.text); setShowOptionsForMessageId(null); };
  const startReplying = (msg) => { setReplyingToMessage(msg); setShowOptionsForMessageId(null); };
  const findSocketIdByUid = (uid) => uidSocketMap[uid] || null;

  const uploadRecording = (blob) => {
    if (!storage || !db || !user) return;
    const recordingRef = ref(storage, `room_recordings/${roomId}/${user.uid}_${Date.now()}.webm`);
    const uploadTask = uploadBytesResumable(recordingRef, blob);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setRecordingUploadProgress(progress);
      },
      (error) => {
        console.error("Recording upload failed:", error);
        alert("Your recording failed to upload.");
        setRecordingUploadProgress(null);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
          const recordingsColPath = `apps/${appId}/recordings`;
          await addDoc(collection(db, recordingsColPath), {
            roomId,
            userId: user.uid,
            userName: userProfile.name,
            url: downloadURL,
            createdAt: serverTimestamp(),
            duration: 0 // Placeholder for duration
          });
          alert("Recording uploaded successfully!");
          setRecordingUploadProgress(null);
        });
      }
    );
  };

  const startRecording = () => {
    if (localStreamRef.current) {
      recordedChunksRef.current = [];
      // Prefer webm but fallback if not supported
      const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
        ? 'video/webm; codecs=vp9'
        : 'video/webm';
      mediaRecorderRef.current = new MediaRecorder(localStreamRef.current, { mimeType });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        uploadRecording(blob);
        recordedChunksRef.current = [];
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } else {
      alert("You must join the room to start recording.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  const ParticipantVideo = ({ stream, participant }) => {
    const videoRef = useRef(null);
    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }, [stream]);

    return (
      <div className="relative aspect-video bg-gray-950 rounded-lg overflow-hidden">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded-md text-sm">{participant.name}</div>
      </div>
    );
  };

  const ReplyQuote = ({ msg }) => <div className="p-2 mb-1 text-xs bg-gray-800 rounded-lg"><p className="font-bold text-gray-400">{msg.senderName}</p><p className="opacity-80 truncate">{msg.text}</p></div>;

  return (
    <div
      className="h-screen bg-cover bg-center text-white grid grid-cols-1 md:grid-cols-4"
      style={{ backgroundImage: roomBackground ? `url(${roomBackground})` : 'none', backgroundColor: !roomBackground ? '#1f2937' : 'transparent' }}
    >
      <div className="md:col-span-3 flex flex-col h-screen bg-black bg-opacity-50">
        <header className="flex justify-between items-center p-4 border-b border-gray-700 bg-black bg-opacity-30">
          <h1 className="text-xl font-bold">Room: {roomId}</h1>
          {isRecording && (
            <div className="flex items-center space-x-2 animate-pulse">
              <Circle className="text-red-500" size={16} fill="red" />
              <span className="text-red-500 font-semibold">REC</span>
            </div>
          )}
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600"><X size={20}/></button>
        </header>
        <div className="flex-grow p-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Local User's Video */}
            {isJoined && (
              <div className="relative aspect-video bg-gray-950 rounded-lg overflow-hidden">
                <video ref={el => { if (el && localStreamRef.current) el.srcObject = localStreamRef.current; }} autoPlay muted playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded-md text-sm">{userProfile.name} (You)</div>
              </div>
            )}
            {participants.filter(p => p.id !== user.uid).map(p => {
              const socketId = findSocketIdByUid(p.id);
              const stream = remoteStreams[socketId];
              return stream ? (
                <ParticipantVideo key={p.id} stream={stream} participant={p} />
              ) : (
                <div key={p.id} className="relative aspect-video bg-gray-950 rounded-lg overflow-hidden flex items-center justify-center">
                  <img src={p.avatar} alt={p.name} className="w-24 h-24 rounded-full" />
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded-md text-sm">{p.name}</div>
                </div>
              );
            })}
          </div>
        </div>
        <footer className="p-4 bg-gray-950 flex justify-center items-center space-x-4 border-t border-gray-700">
          <button onClick={isJoined ? endVoiceChat : joinRoom} className={`p-4 rounded-full text-white shadow-lg ${isJoined ? 'bg-red-600' : 'bg-green-600'}`}>{isJoined ? <PhoneMissed /> : <PhoneCall />}</button>
          {isJoined && (
            <>
              <button onClick={toggleMute} className={`p-4 rounded-full shadow-lg ${isMuted ? 'bg-gray-600' : 'bg-blue-600'}`}>{isMuted ? <MicOff /> : <Mic />}</button>
              <button onClick={toggleVideo} className={`p-4 rounded-full shadow-lg ${!isVideoEnabled ? 'bg-gray-600' : 'bg-blue-600'}`}>{isVideoEnabled ? <Video /> : <VideoOff />}</button>
              <button onClick={isRecording ? stopRecording : startRecording} className={`p-4 rounded-full shadow-lg ${isRecording ? 'bg-red-700 animate-pulse' : 'bg-red-500'}`}>
                <Circle />
              </button>
            </>
          )}
        </footer>
      </div>
      <div className="md:col-span-1 flex flex-col bg-gray-800 border-l border-gray-700 h-screen">
        <div className="p-4 border-b border-gray-700"><h2 className="text-xl font-bold">Chat</h2></div>
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">{isLoadingMessages ? <div className="flex justify-center items-center h-full"><div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-blue-500"></div></div> : messages.map(message => (<div key={message.id} className={`group relative my-2 flex flex-col ${message.senderId === user.uid ? 'items-end' : 'items-start'}`}><div className={`px-3 py-2 rounded-lg max-w-xs ${message.senderId === user.uid ? 'bg-blue-600' : 'bg-gray-700'}`}><p className="text-xs font-bold text-gray-400">{message.senderName}</p>{message.replyTo && <ReplyQuote msg={message.replyTo} />}{editingMessageId === message.id ? ( <form onSubmit={handleUpdateMessage}><input type="text" value={editingText} onChange={(e) => setEditingText(e.target.value)} className="w-full bg-blue-700 text-white rounded p-1" autoFocus/><div className="flex justify-end space-x-2 mt-1"><button type="button" onClick={() => setEditingMessageId(null)} className="text-xs">Cancel</button><button type="submit" className="text-xs font-bold">Save</button></div></form>) : (message.type === 'image' ? <img src={message.file.url} alt={message.file.name} className="rounded-lg max-w-full h-auto mt-1" /> : message.type === 'file' ? <a href={message.file.url} target="_blank" rel="noopener noreferrer" className="flex items-center underline text-blue-300"><FileIcon className="mr-2"/>{message.file.name}</a> : <p className="text-sm break-words">{message.text}</p>)}<p className="text-xs text-gray-400 mt-1 text-right">{message.isEdited && <i>(edited)</i>}</p></div>{message.senderId === user.uid && (<div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100"><button onClick={() => setShowOptionsForMessageId(showOptionsForMessageId === message.id ? null : message.id)} className="p-1 rounded-full hover:bg-gray-600"><MoreHorizontal size={14}/></button>{showOptionsForMessageId === message.id && (<div className="absolute left-full ml-1 w-28 bg-gray-900 border border-gray-700 rounded shadow-lg z-10 py-1"><button onClick={() => startReplying(message)} className="w-full text-left text-sm px-3 py-1.5 hover:bg-gray-700 flex items-center"><MessageSquare size={14} className="mr-2"/> Reply</button>{message.type === 'text' && <button onClick={() => startEditing(message)} className="w-full text-left text-sm px-3 py-1.5 hover:bg-gray-700 flex items-center"><Edit size={14} className="mr-2"/> Edit</button>}<button onClick={() => handleDeleteMessage(message.id)} className="w-full text-left text-sm px-3 py-1.5 text-red-400 hover:bg-gray-700 flex items-center"><Trash2 size={14} className="mr-2"/> Delete</button></div>)}</div>)}</div>))}<div ref={messagesEndRef} /></div>
        <div className="h-5 text-sm text-gray-400 italic px-4">{typingUsers.length > 0 && `${typingUsers.join(', ')} is typing...`}</div>
        {uploadingFile && <div className="p-4"><p className="text-sm">Uploading: {uploadingFile.name}</p><div className="w-full bg-gray-700 rounded-full h-2.5"><div className="bg-blue-600 h-2.5 rounded-full" style={{width: `${uploadProgress}%`}}></div></div></div>}
        {recordingUploadProgress !== null && <div className="p-4"><p className="text-sm">Uploading Recording...</p><div className="w-full bg-gray-700 rounded-full h-2.5"><div className="bg-purple-600 h-2.5 rounded-full" style={{width: `${recordingUploadProgress}%`}}></div></div></div>}
        <div className="p-4 border-t border-gray-700">{replyingToMessage && <div className="p-2 mb-2 bg-gray-700 rounded-lg text-sm flex justify-between items-center"><div><p className="font-bold">Replying to {replyingToMessage.senderName}</p><p className="opacity-80 truncate">{replyingToMessage.text}</p></div><button onClick={() => setReplyingToMessage(null)} className="p-1"><X size={16}/></button></div>}<form onSubmit={handleSendMessage} className="flex items-center space-x-2"><input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" /><button type="button" onClick={() => fileInputRef.current.click()} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600"><Paperclip size={20}/></button><input type="text" value={inputMessage} onChange={handleInputChange} placeholder="Send a message..." className="flex-1 p-2 rounded-full bg-gray-700 focus:outline-none"/><button type="submit" disabled={uploadingFile || recordingUploadProgress !== null} className="p-2 rounded-full bg-blue-600"><Send size={20}/></button></form></div>
      </div>
      <div ref={audioContainerRef} />
    </div>
  );
};

export default VoiceChatRoom;
