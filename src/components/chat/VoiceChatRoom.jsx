import React, { useState, useEffect, useRef, useContext } from 'react';
import * as THREE from 'three';
import { Mic, MicOff, MessageSquare, CornerUpLeft, PhoneCall, PhoneMissed, Send, MoreHorizontal, Gift, X } from 'lucide-react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { ThemeContext } from '../../context/ThemeContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import io from 'socket.io-client';
import { useNavigate, useParams } from 'react-router-dom';

const SIGNALING_SERVER_URL = 'http://localhost:3001';

const getCategorizedUsers = (users) => {
  const speakers = users.filter(user => user.onStage);
  const listeners = users.filter(user => !user.onStage);
  return { speakers, listeners };
};

const VoiceChatRoom = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const { user, userProfile, db, appId } = useAuth();
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});

  const socketRef = useRef();
  const peerConnectionsRef = useRef({});
  const audioContainerRef = useRef();

  // State for text chat
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const { themeClasses } = useContext(ThemeContext);
  const [isAILoading, setIsAILoading] = useState(false);

  // Participant management effect
  useEffect(() => {
    if (!db || !user?.uid || !roomId || !userProfile) return;

    const participantRef = doc(db, `/artifacts/${appId}/public/data/voice_rooms/${roomId}/participants`, user.uid);

    setDoc(participantRef, {
      name: userProfile.name,
      avatar: userProfile.avatar,
      uid: user.uid,
      joinedAt: serverTimestamp(),
      onStage: true, // Default to speaker now
      speaking: false,
    }).catch(console.error);

    const participantsColRef = collection(db, `/artifacts/${appId}/public/data/voice_rooms/${roomId}/participants`);
    const q = query(participantsColRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedParticipants = [];
      snapshot.forEach((doc) => {
        fetchedParticipants.push({ id: doc.id, ...doc.data() });
      });
      setParticipants(fetchedParticipants);
    }, (error) => console.error("Error fetching participants:", error));

    return () => {
      unsubscribe();
      deleteDoc(participantRef).catch(console.error);
    };
  }, [db, user, roomId, userProfile, appId]);

  // Effect to fetch room details
  useEffect(() => {
    if (!db || !roomId) return;
    const roomRef = doc(db, `/artifacts/${appId}/public/data/rooms`, roomId);
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        setRoom(docSnap.data());
      } else {
        console.error("Room not found!");
        navigate('/dashboard');
      }
    });
    return () => unsubscribe();
  }, [db, roomId, appId, navigate]);

  // WebRTC Signaling Effect
  useEffect(() => {
    if (!isJoined || !localStream) return;

    socketRef.current = io(SIGNALING_SERVER_URL);
    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to signaling server');
      socket.emit('join-room', roomId);
    });

    socket.on('user-joined', (peerId) => {
      console.log(`User ${peerId} joined the room, sending offer.`);
      createPeerConnection(peerId, true);
    });

    socket.on('offer', async ({ sdp, sender }) => {
      console.log(`Received offer from ${sender}`);
      const pc = createPeerConnection(sender, false);
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { target: sender, sdp: pc.localDescription.sdp });
    });

    socket.on('answer', async ({ sdp, sender }) => {
      console.log(`Received answer from ${sender}`);
      const pc = peerConnectionsRef.current[sender];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
      }
    });

    socket.on('ice-candidate', ({ candidate, sender }) => {
      const pc = peerConnectionsRef.current[sender];
      if (pc && candidate) {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    const createPeerConnection = (peerId, isInitiator) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });

      peerConnectionsRef.current[peerId] = pc;

      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', {
            target: peerId,
            candidate: event.candidate,
            roomId: roomId
          });
        }
      };

      pc.ontrack = (event) => {
        console.log(`Received remote track from ${peerId}`);
        setRemoteStreams(prev => ({...prev, [peerId]: event.streams[0]}));
      };

      if (isInitiator) {
        pc.createOffer()
          .then(offer => pc.setLocalDescription(offer))
          .then(() => {
            socket.emit('offer', { target: peerId, sdp: pc.localDescription.sdp });
          });
      }
      return pc;
    };

    return () => {
      localStream.getTracks().forEach(track => track.stop());
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      peerConnectionsRef.current = {};
      socket.disconnect();
    };

  }, [isJoined, localStream, roomId, navigate]);


  const startVoiceChat = async () => {
    try {
      console.log("Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      setIsJoined(true);
      console.log("Joined voice chat room successfully!");
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const endVoiceChat = () => {
    setIsJoined(false); // This will trigger the cleanup in the useEffect
    setLocalStream(null);
    console.log("Left voice chat room.");
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  // Other functions (text chat, etc.) remain largely the same...
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (inputMessage.trim() === '' || !db || isSendingMessage) return;
    setIsSendingMessage(true);
    const publicChatPath = `/artifacts/${appId}/public/data/voice_rooms/${roomId}/messages`;
    await addDoc(collection(db, publicChatPath), {
      senderId: user.uid,
      senderName: userProfile?.name || 'مجهول',
      text: inputMessage,
      createdAt: serverTimestamp(),
    });
    setInputMessage('');
    setIsSendingMessage(false);
  };

  const { speakers, listeners } = getCategorizedUsers(participants);
  const isLargeHall = room?.roomType === 'large_hall';

  return (
    <div className={`relative flex flex-col min-h-screen p-4 antialiased overflow-hidden ${themeClasses}`}>
      <div className="absolute inset-0 -z-10" ref={useRef()}></div>
      <div className="absolute inset-0 bg-black opacity-60 -z-10"></div>

      {/* Container for remote audio elements */}
      <div ref={audioContainerRef}>
        {Object.entries(remoteStreams).map(([peerId, stream]) => (
          <AudioPlayer key={peerId} stream={stream} />
        ))}
      </div>

      <header className="flex justify-between items-center p-4 rounded-3xl mb-4 shadow-lg bg-gray-900/50 backdrop-blur-sm z-20">
        <button onClick={() => navigate('/dashboard')} className="p-2 rounded-full hover:bg-gray-800 transition-colors duration-200">
          <CornerUpLeft className="w-6 h-6 text-white" />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-xl font-extrabold text-white">{room?.title || 'غرفة المحادثة'}</h1>
          <p className="text-sm text-gray-400">ID: {roomId.substring(0, 8)}...</p>
        </div>
        <button className="p-2 rounded-full hover:bg-gray-800 transition-colors duration-200">
          <MoreHorizontal className="w-6 h-6 text-white" />
        </button>
      </header>

      <main className={`flex-1 flex flex-col md:flex-row-reverse z-10`}>
        {/* Chat Panel unchanged */}

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col p-4 transition-all duration-300 ${showChat ? 'md:mr-96' : ''}`}>
          {/* Speakers Section */}
          <section className={`p-4 rounded-3xl mb-4 shadow-xl bg-gray-900/50 backdrop-blur-sm transition-all duration-300 ${isLargeHall ? 'h-56' : 'h-32'}`}>
            <h2 className="text-lg font-bold text-white mb-2 border-b border-gray-700 pb-2">المتحدثون ({speakers.length})</h2>
            <div className={`flex items-center space-x-4 overflow-x-auto ${isLargeHall ? 'justify-center' : ''}`}>
              {speakers.map(p => (
                <div key={p.id} className="flex flex-col items-center">
                  <div className={`w-20 h-20 rounded-full border-4 ${p.speaking ? 'border-green-400 animate-pulse-border' : 'border-gray-500'} transition-all duration-300 overflow-hidden`}>
                    <img src={p.avatar} alt={p.name} className="w-full h-full object-cover rounded-full" />
                  </div>
                  <span className="text-sm mt-2 text-white">{p.name}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Controls */}
          <div className="flex justify-center my-6 space-x-6">
            <button
              onClick={isJoined ? endVoiceChat : startVoiceChat}
              className={`p-4 rounded-full text-white shadow-lg transition-all duration-300 transform hover:scale-110 ${isJoined ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {isJoined ? <PhoneMissed className="w-8 h-8" /> : <PhoneCall className="w-8 h-8" />}
            </button>
            {isJoined && (
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 ${isMuted ? 'bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isMuted ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
              </button>
            )}
            <button onClick={() => setShowChat(!showChat)} className="p-4 rounded-full bg-indigo-600 text-white shadow-lg transition-all duration-300 transform hover:scale-110">
              <MessageSquare className="w-8 h-8" />
            </button>
            <button className="p-4 rounded-full bg-yellow-600 text-white shadow-lg transition-all duration-300 transform hover:scale-110" onClick={() => {}}>
              <Gift className="w-8 h-8" />
            </button>
          </div>

          {/* Listeners Section */}
          <section className="p-4 rounded-3xl mt-auto shadow-xl bg-gray-900/50 backdrop-blur-sm h-32 overflow-hidden">
            <h2 className="text-lg font-bold text-white mb-2 border-b border-gray-700 pb-2">المستمعون ({listeners.length})</h2>
            <div className="flex items-center space-x-2 overflow-x-auto">
              {listeners.map(p => (
                <div key={p.id} className="flex flex-col items-center flex-shrink-0">
                  <div className="w-12 h-12 rounded-full border-2 border-gray-500 overflow-hidden">
                    <img src={p.avatar} alt={p.name} className="w-full h-full object-cover rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

const AudioPlayer = ({ stream }) => {
    const audioRef = useRef();
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.srcObject = stream;
        }
    }, [stream]);
    return <audio ref={audioRef} autoPlay />;
};

export default VoiceChatRoom;
