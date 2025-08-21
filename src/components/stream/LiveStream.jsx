import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import { CornerUpLeft, Radio, XCircle, Users } from 'lucide-react';

const LiveStream = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const { isDarkMode, themeClasses } = useContext(ThemeContext);

  const [isBroadcaster, setIsBroadcaster] = useState(false);
  const [streamId, setStreamId] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [stream, setStream] = useState(null);

  const socketRef = useRef();
  const videoRef = useRef();
  const peersRef = useRef({}); // For broadcaster: { watcherId: RTCPeerConnection }

  useEffect(() => {
    const isStartingStream = location.pathname.endsWith('/start');
    setIsBroadcaster(isStartingStream);
    const currentStreamId = isStartingStream ? user?.uid : params.streamId;
    setStreamId(currentStreamId);
  }, [location.pathname, params.streamId, user]);

  useEffect(() => {
    if (!streamId) return;

    socketRef.current = io(import.meta.env.VITE_SIGNALING_SERVER_URL);

    if (isBroadcaster) {
      // Logic for broadcaster is handled by button click
    } else {
      // --- WATCHER LOGIC ---
      const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peersRef.current['broadcaster'] = peer; // There's only one peer connection needed for the watcher

      // Handle incoming stream from the broadcaster
      peer.ontrack = event => {
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
          setIsLive(true);
        }
      };

      // Handle ICE candidates: send them to the broadcaster via the server
      peer.onicecandidate = event => {
        if (event.candidate) {
          // The server will find the broadcaster based on the streamId
          socketRef.current.emit('watcher-signal-to-streamer', { streamId, signal: { candidate: event.candidate } });
        }
      };

      // This listener handles signals (offer, candidates) from the broadcaster
      socketRef.current.on('stream-signal-from-broadcaster', async ({ broadcasterId, signal }) => {
        try {
          if (signal.sdp) { // This is the offer from the broadcaster
            await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            // Send the answer back to the specific broadcaster
            socketRef.current.emit('watcher-signal-to-streamer', { broadcasterId, signal: { sdp: answer } });
          } else if (signal.candidate) { // This is an ICE candidate from the broadcaster
            await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        } catch (error) {
          console.error("Error processing signal from broadcaster:", error);
        }
      });

      // Tell the server we want to watch this stream
      socketRef.current.emit('watch-stream', streamId);
    }

    socketRef.current.on('stream-ended', (endedStreamId) => {
      if (endedStreamId === streamId) {
        alert("The stream has ended.");
        navigate('/');
      }
    });

    return () => {
      socketRef.current.disconnect();
      if (isBroadcaster) handleStopStream();
      Object.values(peersRef.current).forEach(peer => peer.close());
    };
  }, [streamId, isBroadcaster]);

  const handleGoLive = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      videoRef.current.srcObject = mediaStream;
      setIsLive(true);
      socketRef.current.emit('start-stream', streamId);

      socketRef.current.on('new-watcher', ({ watcherId }) => {
        const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        peersRef.current[watcherId] = peer;
        setViewerCount(prev => prev + 1);

        mediaStream.getTracks().forEach(track => peer.addTrack(track, mediaStream));

        peer.onicecandidate = event => {
          if (event.candidate) {
            socketRef.current.emit('stream-signal-to-watcher', { watcherId, signal: { candidate: event.candidate } });
          }
        };

        peer.createOffer().then(offer => {
          peer.setLocalDescription(offer);
          socketRef.current.emit('stream-signal-to-watcher', { watcherId, signal: { sdp: offer, broadcasterId: socketRef.current.id } });
        });
      });

      socketRef.current.on('watcher-signal', ({ watcherId, signal }) => {
        const peer = peersRef.current[watcherId];
        if (peer) {
          if (signal.sdp) {
            peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          } else if (signal.candidate) {
            peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        }
      });

    } catch (error) {
      console.error("Could not start stream:", error);
    }
  };

  const handleStopStream = () => {
    socketRef.current.emit('stop-stream', streamId);
    stream?.getTracks().forEach(track => track.stop());
    setIsLive(false);
    setStream(null);
  };

  const renderBroadcasterView = () => (
    <div className="w-full h-full flex flex-col">
      <div className="relative flex-1 bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
        {isLive && (
          <div className="absolute top-4 left-4 flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full animate-pulse">
              <Radio size={16} />
              <span>LIVE</span>
            </div>
            <div className="flex items-center space-x-2 bg-gray-800/70 text-white px-3 py-1 rounded-full">
              <Users size={16} />
              <span>{viewerCount}</span>
            </div>
          </div>
        )}
      </div>
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
    </div>
  );

  const renderWatcherView = () => (
    <div className="w-full h-full flex flex-col">
       <div className="relative flex-1 bg-black">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" />
        <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full">
            <Radio size={16} />
            <span>LIVE</span>
        </div>
       </div>
    </div>
  );

  return (
    <div className={`flex flex-col min-h-screen ${themeClasses}`}>
      <header className={`flex items-center justify-between p-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'} border-b border-gray-700`}>
        <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-gray-700"><CornerUpLeft /></button>
        <h1 className="text-xl font-bold">{isBroadcaster ? 'Your Live Stream' : `Watching ${streamId}`}</h1>
        <div className="w-10"></div>
      </header>
      <main className="flex-1 flex items-center justify-center">
        {isBroadcaster ? renderBroadcasterView() : renderWatcherView()}
      </main>
    </div>
  );
};

export default LiveStream;
