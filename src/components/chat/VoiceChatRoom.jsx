import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Mic, MicOff, PhoneCall, PhoneMissed } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const VoiceChatRoom = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { roomId } = useParams();

  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const localStreamRef = useRef(null);
  const audioContainerRef = useRef(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    // 1. Connect to the signaling server
    const signalingServerUrl = import.meta.env.VITE_SIGNALING_SERVER_URL || 'http://localhost:3001';
    socketRef.current = io(signalingServerUrl);
    const socket = socketRef.current;

    // Announce our arrival
    socket.emit('join-room', roomId, user.uid);

    // 2. Handle new user joining the room
    socket.on('user-joined', (newUserId, newSocketId) => {
      console.log(`New user joined: ${newUserId}, creating offer...`);
      createPeerConnection(newSocketId, true);
    });

    // 3. Handle receiving an offer
    socket.on('webrtc-offer', async ({ senderSocketId, sdp }) => {
      console.log(`Received offer from ${senderSocketId}`);
      const pc = createPeerConnection(senderSocketId, false);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('webrtc-answer', {
        targetSocketId: senderSocketId,
        sdp: pc.localDescription,
      });
    });

    // 4. Handle receiving an answer
    socket.on('webrtc-answer', async ({ senderSocketId, sdp }) => {
      console.log(`Received answer from ${senderSocketId}`);
      const pc = peerConnectionsRef.current[senderSocketId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    });

    // 5. Handle receiving an ICE candidate
    socket.on('webrtc-ice-candidate', ({ senderSocketId, candidate }) => {
      console.log(`Received ICE candidate from ${senderSocketId}`);
      const pc = peerConnectionsRef.current[senderSocketId];
      if (pc && candidate) {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // 6. Handle user leaving
    socket.on('user-left', (socketId) => {
      console.log(`User with socket ID ${socketId} left.`);
      if (peerConnectionsRef.current[socketId]) {
        peerConnectionsRef.current[socketId].close();
        delete peerConnectionsRef.current[socketId];
      }
      const audioEl = document.getElementById(socketId);
      if (audioEl) {
        audioEl.remove();
      }
    });

    // Cleanup on component unmount
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      socket.disconnect();
    };
  }, [roomId, user.uid]);

  const createPeerConnection = (targetSocketId, isOfferor) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('webrtc-ice-candidate', {
          targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      let audioEl = document.getElementById(targetSocketId);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = targetSocketId;
        audioEl.autoplay = true;
        audioContainerRef.current.appendChild(audioEl);
      }
      audioEl.srcObject = remoteStream;
    };

    if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current);
        });
    }

    peerConnectionsRef.current[targetSocketId] = pc;

    if (isOfferor) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          socketRef.current.emit('webrtc-offer', {
            targetSocketId,
            sdp: pc.localDescription,
          });
        });
    }

    return pc;
  };

  const startVoiceChat = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setIsJoined(true);
      // At this point, new users who join will get our stream.
      // We could also re-initiate connections to existing users if needed.
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const endVoiceChat = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    localStreamRef.current = null;

    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};

    setIsJoined(false);
    socketRef.current.disconnect();
    navigate('/dashboard');
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4">Voice Chat Room: {roomId}</h1>
      <div className="flex justify-center my-6 space-x-6">
        <button
          onClick={isJoined ? endVoiceChat : startVoiceChat}
          className={`p-4 rounded-full text-white shadow-lg ${isJoined ? 'bg-red-600' : 'bg-green-600'}`}
        >
          {isJoined ? <PhoneMissed className="w-8 h-8" /> : <PhoneCall className="w-8 h-8" />}
        </button>
        {isJoined && (
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full shadow-lg ${isMuted ? 'bg-gray-600' : 'bg-blue-600'}`}
          >
            {isMuted ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
          </button>
        )}
      </div>
      <div ref={audioContainerRef}>
        {/* Remote audio streams will be appended here */}
      </div>
    </div>
  );
};

export default VoiceChatRoom;
