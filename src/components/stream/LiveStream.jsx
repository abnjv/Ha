import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import { CornerUpLeft, Radio, XCircle, Users, Send } from 'lucide-react';

const LiveStream = () => {
  const { user, userProfile, socket } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const { isDarkMode, themeClasses } = useContext(ThemeContext);

  const [isBroadcaster, setIsBroadcaster] = useState(false);
  const [streamId, setStreamId] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [stream, setStream] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');

  const videoRef = useRef();
  const peersRef = useRef({}); // For broadcaster: { watcherId: RTCPeerConnection }

  useEffect(() => {
    const isStartingStream = location.pathname.endsWith('/start');
    setIsBroadcaster(isStartingStream);
    const currentStreamId = isStartingStream ? user?.uid : params.streamId;
    setStreamId(currentStreamId);
  }, [location.pathname, params.streamId, user]);

  useEffect(() => {
    if (!streamId || !socket) return;

    socket.emit('join-room', streamId, user.uid);

    const handleStreamSignal = ({ signal }) => {
      const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peersRef.current['broadcaster'] = peer;

      peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      peer.createAnswer().then(answer => {
        peer.setLocalDescription(answer);
        socket.emit('watcher-signal-to-streamer', { broadcasterId: signal.broadcasterId, signal: { sdp: answer } });
      });

      peer.onicecandidate = event => {
        if (event.candidate) {
          socket.emit('watcher-signal-to-streamer', { broadcasterId: signal.broadcasterId, signal: { candidate: event.candidate } });
        }
      };

      peer.ontrack = event => {
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
        }
      };
    };

    const handleStreamEnded = (endedStreamId) => {
      if (endedStreamId === streamId) {
        alert("The stream has ended.");
        navigate('/');
      }
    };

    if (!isBroadcaster) {
      socket.emit('watch-stream', streamId);
      socket.on('stream-signal-from-broadcaster', handleStreamSignal);
    }

    socket.on('stream-ended', handleStreamEnded);

    return () => {
      socket.off('stream-signal-from-broadcaster', handleStreamSignal);
      socket.off('stream-ended', handleStreamEnded);
      if (isBroadcaster) handleStopStream();
      Object.values(peersRef.current).forEach(peer => peer.close());
    };
  }, [streamId, isBroadcaster, socket]);

  const handleGoLive = async () => {
    if (!socket) return;
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      videoRef.current.srcObject = mediaStream;
      setIsLive(true);
      socket.emit('start-stream', streamId);

      const handleNewWatcher = ({ watcherId }) => {
        const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        peersRef.current[watcherId] = peer;
        setViewerCount(prev => prev + 1);

        mediaStream.getTracks().forEach(track => peer.addTrack(track, mediaStream));

        peer.onicecandidate = event => {
          if (event.candidate) {
            socket.emit('stream-signal-to-watcher', { watcherId, signal: { candidate: event.candidate } });
          }
        };

        peer.createOffer().then(offer => {
          peer.setLocalDescription(offer);
          socket.emit('stream-signal-to-watcher', { watcherId, signal: { sdp: offer, broadcasterId: socket.id } });
        });
      };

      const handleWatcherSignal = ({ watcherId, signal }) => {
        const peer = peersRef.current[watcherId];
        if (peer) {
          if (signal.sdp) {
            peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          } else if (signal.candidate) {
            peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        }
      };

      socket.on('new-watcher', handleNewWatcher);
      socket.on('watcher-signal', handleWatcherSignal);

    } catch (error) {
      console.error("Could not start stream:", error);
    }
  };

  const handleStopStream = () => {
    if (!socket) return;
    socket.emit('stop-stream', streamId);
    stream?.getTracks().forEach(track => track.stop());
    setIsLive(false);
    setStream(null);
  };

  // Combined render logic for both broadcaster and watcher
  const renderStreamView = () => (
    <div className="w-full h-full flex flex-col">
      <div className="relative flex-1 bg-black">
        <video ref={videoRef} autoPlay playsInline muted={isBroadcaster} className="w-full h-full object-contain" />
        <div className="absolute top-4 left-4 flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full animate-pulse">
            <Radio size={16} />
            <span>LIVE</span>
          </div>
          {isBroadcaster && (
            <div className="flex items-center space-x-2 bg-gray-800/70 text-white px-3 py-1 rounded-full">
              <Users size={16} />
              <span>{viewerCount}</span>
            </div>
          )}
        </div>
      </div>
      {isBroadcaster && (
        <div className="p-4 bg-gray-800 flex justify-center">
          {isLive ? (
            <button onClick={handleStopStream} className="px-6 py-3 bg-red-600 text-white font-bold rounded-full flex items-center space-x-2">
              <XCircle />
              <span>Stop Stream</span>
            </button>
          ) : (
            <button onClick={handleGoLive} className="px-6 py-3 bg-green-600 text-white font-bold rounded-full">Go Live</button>
          )}
        </div>
      )}
    </div>
  );

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputMessage.trim() && socket) {
      const messageData = {
        text: inputMessage,
        user: userProfile.name,
        streamId: streamId,
      };
      socket.emit('live-chat-message', messageData);
      setInputMessage('');
    }
  };

  useEffect(() => {
    if (socket) {
      const handleChatMessage = (message) => {
        setChatMessages(prevMessages => [...prevMessages, message]);
      };
      socket.on('live-chat-message', handleChatMessage);
      return () => {
        socket.off('live-chat-message', handleChatMessage);
      };
    }
  }, [socket]);

  return (
    <div className={`flex h-screen ${themeClasses}`}>
      <div className="flex-1 flex flex-col">
        <header className={`flex items-center justify-between p-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'} border-b border-gray-700`}>
          <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-gray-700"><CornerUpLeft /></button>
          <h1 className="text-xl font-bold">{isBroadcaster ? 'Your Live Stream' : `Watching ${streamId}`}</h1>
          <div className="w-10"></div>
        </header>
      <main className="flex-1 flex items-center justify-center bg-black">
        {renderStreamView()}
        </main>
      </div>
      <div className="w-96 flex flex-col bg-gray-800 border-l border-gray-700">
        <div className="p-4 border-b border-gray-700"><h2 className="text-xl font-bold">Live Chat</h2></div>
        <div className="flex-1 p-4 overflow-y-auto space-y-2">
          {chatMessages.map((msg, index) => (
            <div key={index}>
              <span className="font-bold">{msg.user}: </span>
              <span>{msg.text}</span>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-700">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Send a message..."
              className="flex-1 p-2 rounded-full bg-gray-700 focus:outline-none"
            />
            <button type="submit" className="p-2 rounded-full bg-blue-600">
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LiveStream;
