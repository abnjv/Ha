import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Mic, MicOff, PhoneCall, PhoneMissed, Send, MessageSquare, MoreHorizontal, Edit, Trash2, X, Paperclip, File as FileIcon, Video, VideoOff, Circle, Bot } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, addDoc, updateDoc, Timestamp, orderBy, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getVoiceRoomMessagesPath, getVoiceRoomPath, ASSISTANT_BOT_ID } from '../../constants';
import { getBotResponse } from '../../bot/supportBot';

const VoiceChatRoom = () => {
  const { user, userProfile, db, storage, appId } = useAuth();
  const navigate = useNavigate();
  const { roomId } = useParams();

  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const localStreamRef = useRef(null);
  const audioIntervalsRef = useRef({});
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const [participants, setParticipants] = useState({});
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

  useEffect(() => {
    // ... (fetchBackground logic)
  }, [userProfile, db, appId]);

  const createPeerConnection = useCallback((targetSocketId, isOfferor) => {
    // ... (createPeerConnection logic)
  }, []);

  useEffect(() => {
    // ... (main socket useEffect logic)
  }, [roomId, user.uid, createPeerConnection, uidSocketMap]);

  useEffect(() => {
    // ... (message fetching logic)
  }, [db, roomId, appId]);

  const joinRoom = async () => {
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setIsVideoEnabled(true);
    } catch (error) {
      try {
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsVideoEnabled(false);
      } catch (audioError) {
        alert("Could not get microphone access. Please check permissions.");
        return;
      }
    }
    setIsJoined(true);
    socketRef.current.emit('join-room', roomId, user.uid, userProfile.name);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const messageText = inputMessage.trim();
    if (messageText === '') return;

    // First, send the user's message
    await sendDbMessage({ type: 'text', text: messageText });
    setInputMessage('');

    // Then, if it's a command for the bot, have the bot respond
    if (messageText.toLowerCase().startsWith('@bot')) {
      const question = messageText.substring(4).trim();

      // Simulate bot "thinking"
      setTimeout(async () => {
        const botResponseText = getBotResponse(question);
        const botMessage = {
          senderId: ASSISTANT_BOT_ID,
          senderName: 'Jules Assistant',
          type: 'text',
          text: botResponseText,
          createdAt: serverTimestamp()
        };
        // Use addDoc directly to post message as the bot
        await addDoc(collection(db, getVoiceRoomMessagesPath(appId, roomId)), botMessage);
      }, 1000 + Math.random() * 500);
    }
  };

  // ... (all other handler functions: endVoiceChat, toggleMute, toggleVideo, recording, file upload, etc.)

  const ParticipantVideo = ({ stream, participant }) => { /* ... */ };
  const ReplyQuote = ({ msg }) => { /* ... */ };

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
            {isJoined && (
              <div className="relative aspect-video bg-gray-950 rounded-lg overflow-hidden">
                <video ref={el => { if (el && localStreamRef.current) el.srcObject = localStreamRef.current; }} autoPlay muted playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded-md text-sm">{userProfile.name} (You)</div>
              </div>
            )}
            {Object.entries(participants)
              .filter(([id]) => id !== user.uid)
              .map(([id, p]) => {
                if (p.type === 'bot') {
                  return (
                    <div key={id} className="relative aspect-video bg-gray-950 rounded-lg overflow-hidden flex flex-col items-center justify-center border-2 border-cyan-500/50">
                      <Bot size={64} className="text-cyan-400" />
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded-md text-sm">{p.name}</div>
                    </div>
                  );
                }
                const socketId = p.socketId;
                const stream = remoteStreams[socketId];
                return stream ? (
                  <ParticipantVideo key={id} stream={stream} participant={p} />
                ) : (
                  <div key={id} className="relative aspect-video bg-gray-950 rounded-lg overflow-hidden flex items-center justify-center">
                    {p.avatar ? <img src={p.avatar} alt={p.name} className="w-24 h-24 rounded-full" /> : <div className="w-24 h-24 rounded-full bg-gray-700" />}
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded-md text-sm">{p.name}</div>
                  </div>
                );
            })}
          </div>
        </div>
        <footer className="p-4 bg-gray-950 flex justify-center items-center space-x-4 border-t border-gray-700">
          {/* ... footer buttons ... */}
        </footer>
      </div>
      <div className="md:col-span-1 flex flex-col bg-gray-800 border-l border-gray-700 h-screen">
        <div className="p-4 border-b border-gray-700"><h2 className="text-xl font-bold">Chat</h2></div>
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          {/* ... message mapping ... */}
        </div>
        <div className="p-4 border-t border-gray-700">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            {/* ... form elements ... */}
          </form>
        </div>
      </div>
    </div>
  );
};

export default VoiceChatRoom;
