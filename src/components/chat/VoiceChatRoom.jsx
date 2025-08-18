import React, { useState, useEffect, useRef, useContext } from 'react';
import * as THREE from 'three';
import { Mic, MicOff, MessageSquare, CornerUpLeft, PhoneCall, PhoneMissed, Send, MoreHorizontal, Gift, X } from 'lucide-react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { ThemeContext } from '../../context/ThemeContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';

// Mock data, will be replaced by props or state
const voiceChatUsers = [
  { id: 'user_1', name: 'أحمد', speaking: true, onStage: true, avatar: 'https://placehold.co/100x100/A855F7/FFFFFF?text=أ' },
  { id: 'user_2', name: 'سارة', speaking: false, onStage: true, avatar: 'https://placehold.co/100x100/EC4899/FFFFFF?text=س' },
  { id: 'user_3', name: 'خالد', speaking: false, onStage: true, avatar: 'https://placehold.co/100x100/2DD4BF/FFFFFF?text=خ' },
  { id: 'user_4', name: 'نورا', speaking: false, onStage: false, avatar: 'https://placehold.co/60x60/F97316/FFFFFF?text=ن' },
  { id: 'user_5', name: 'علي', speaking: false, onStage: false, avatar: 'https://placehold.co/60x60/3B82F6/FFFFFF?text=ع' },
  { id: 'user_6', name: 'ليلى', speaking: true, onStage: false, avatar: 'https://placehold.co/60x60/8B5CF6/FFFFFF?text=ل' },
  { id: 'user_7', name: 'فاطمة', speaking: false, onStage: false, avatar: 'https://placehold.co/60x60/EAB308/FFFFFF?text=ف' },
  { id: 'user_8', name: 'يوسف', speaking: false, onStage: false, avatar: 'https://placehold.co/60x60/10B981/FFFFFF?text=ي' },
];

const getCategorizedUsers = (users) => {
  const speakers = users.filter(user => user.onStage);
  const listeners = users.filter(user => !user.onStage);
  return { speakers, listeners };
};


const VoiceChatRoom = ({ onBack, userId, roomId, userProfile, setUserProfile, roomType, db, appId }) => {
  const [users] = useState(voiceChatUsers);
  const [isMuted, setIsMuted] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const { themeClasses } = useContext(ThemeContext);
  const currentUser = userProfile;
  const [isAILoading, setIsAILoading] = useState(false);

  // THREE.js Scene Refs
  const canvasRef = useRef();
  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef(new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000));
  const objectRef = useRef();

  const [giftEffects, setGiftEffects] = useState([]);
  const giftEffectIntervalRef = useRef(null);
  const giftEffectIdCounter = useRef(0);

  const addGiftEffect = (type, senderName) => {
    const newEffect = {
      id: giftEffectIdCounter.current++,
      type,
      senderName,
      x: Math.random() * window.innerWidth,
      y: window.innerHeight,
      style: {
        fontSize: `${Math.random() * 2 + 1}rem`,
        opacity: 0.9,
      }
    };
    setGiftEffects(prev => [...prev, newEffect]);
  };

  useEffect(() => {
    giftEffectIntervalRef.current = setInterval(() => {
      setGiftEffects(prev => prev.filter(effect => effect.y > -50));
    }, 100);

    const animateGiftEffects = () => {
      setGiftEffects(prev => prev.map(effect => ({
        ...effect,
        y: effect.y - 3,
        style: {
          ...effect.style,
          opacity: effect.y / window.innerHeight,
        }
      })));
      requestAnimationFrame(animateGiftEffects);
    };

    animateGiftEffects();

    return () => {
      clearInterval(giftEffectIntervalRef.current);
    };
  }, []);


  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    canvas.appendChild(renderer.domElement);

    while (scene.children.length > 0) {
      scene.remove(scene.children[0]);
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    let geometry, material;
    if (roomType === 'small_group') {
      geometry = new THREE.TorusGeometry(1.5, 0.5, 16, 100);
      material = new THREE.MeshStandardMaterial({
        color: 0x9c27b0,
        emissive: 0x6a1b9a,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.7,
      });
    } else {
      geometry = new THREE.SphereGeometry(2, 32, 32);
      material = new THREE.MeshStandardMaterial({
        color: 0x8800ff,
        emissive: 0x4400ff,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.8,
      });
    }

    objectRef.current = new THREE.Mesh(geometry, material);
    scene.add(objectRef.current);
    camera.position.z = 5;

    const animate = () => {
      requestAnimationFrame(animate);
      if (objectRef.current) {
        objectRef.current.rotation.y += 0.005;
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement.parentNode === canvas) {
        canvas.removeChild(renderer.domElement);
      }
    };
  }, [roomType]);

  useEffect(() => {
    if (db) {
      const publicChatPath = `/artifacts/${appId}/public/data/voice_rooms/${roomId}/messages`;
      const q = query(collection(db, publicChatPath), orderBy('createdAt'));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedMessages = [];
        querySnapshot.forEach((doc) => {
          const data = { id: doc.id, ...doc.data() };
          fetchedMessages.push(data);
          if (data.isGift) {
            addGiftEffect(data.giftType, data.senderName);
          }
        });
        setMessages(fetchedMessages);
        setIsLoadingMessages(false);
      }, (error) => {
        console.error("Error fetching messages:", error);
        setIsLoadingMessages(false);
      });
      return () => unsubscribe();
    }
  }, [roomId, userId, db, appId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showChat]);

  // Function to update user's XP
  const updateXP = async (xpGain) => {
    if (!db || !userId) return;
    const userDocRef = doc(db, `/artifacts/${appId}/users/${userId}/profile`, 'data');
    try {
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const currentXP = docSnap.data().xp || 0;
        await updateDoc(userDocRef, {
          xp: currentXP + xpGain
        });
        setUserProfile(prev => ({ ...prev, xp: currentXP + xpGain }));
      }
    } catch (error) {
      console.error("Error updating XP:", error);
    }
  };

  const callGeminiAPI = async (prompt) => {
    setIsAILoading(true);
    let retryCount = 0;
    const maxRetries = 5;
    const baseDelay = 1000;

    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY; // Using environment variable
    if (!apiKey) {
        console.error("Gemini API key not found.");
        setIsAILoading(false);
        return;
    }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    while (retryCount < maxRetries) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.status === 429) {
          const delay = baseDelay * Math.pow(2, retryCount);
          console.warn(`Rate limit hit, retrying in ${delay}ms...`);
          await new Promise(res => setTimeout(res, delay));
          retryCount++;
          continue;
        }

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }

        const result = await response.json();
        const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
          const publicChatPath = `/artifacts/${appId}/public/data/voice_rooms/${roomId}/messages`;
          await addDoc(collection(db, publicChatPath), {
            senderId: 'ai-assistant',
            senderName: 'المساعد الذكي',
            text: text,
            isAI: true,
            createdAt: serverTimestamp(),
          });
          setIsAILoading(false);
          return;
        } else {
          throw new Error('Invalid API response structure');
        }
      } catch (error) {
        console.error('Error calling Gemini API:', error);
        retryCount++;
        if (retryCount >= maxRetries) {
          console.error("Failed to call Gemini API after multiple retries.");
          setIsAILoading(false);
          const publicChatPath = `/artifacts/${appId}/public/data/voice_rooms/${roomId}/messages`;
          await addDoc(collection(db, publicChatPath), {
            senderId: 'ai-assistant',
            senderName: 'المساعد الذكي',
            text: 'عذراً، لم أستطع الإجابة على سؤالك الآن. يرجى المحاولة لاحقاً.',
            isAI: true,
            createdAt: serverTimestamp(),
          });
        }
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (inputMessage.trim() === '' || !db || isSendingMessage) {
      return;
    }

    setIsSendingMessage(true);
    const publicChatPath = `/artifacts/${appId}/public/data/voice_rooms/${roomId}/messages`;

    // Check if the message is a command for the AI
    if (inputMessage.startsWith('/ask') || inputMessage.startsWith('/اسأل')) {
      const prompt = inputMessage.slice(inputMessage.indexOf(' ') + 1).trim();
      if (prompt) {
        await addDoc(collection(db, publicChatPath), {
          senderId: userId,
          senderName: currentUser?.name || 'مجهول',
          text: inputMessage,
          createdAt: serverTimestamp(),
        });
        callGeminiAPI(prompt);
      }
    } else {
      try {
        await addDoc(collection(db, publicChatPath), {
          senderId: userId,
          senderName: currentUser?.name || 'مجهول',
          text: inputMessage,
          createdAt: serverTimestamp(),
        });
        // Award XP for sending a message
        updateXP(1);
      } catch (error) {
        console.error("Error adding document: ", error);
      }
    }

    setInputMessage('');
    setIsSendingMessage(false);
  };

  const startVoiceChat = async () => {
    try {
      console.log("Requesting microphone access...");
      const stream = {
        getAudioTracks: () => [{ enabled: true }],
        play: () => console.log("Playing remote audio stream..."),
        getTracks: () => [{ stop: () => console.log("Stopping stream track...") }]
      };
      setLocalStream(stream);

      console.log("Setting up peer connection...");
      setTimeout(() => {
        setIsJoined(true);
        console.log("Joined voice chat room successfully!");
      }, 1500);

    } catch (error) {
      console.error("Error accessing microphone or setting up WebRTC:", error);
    }
  };

  const endVoiceChat = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setIsJoined(false);
    console.log("Left voice chat room.");
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const { speakers, listeners } = getCategorizedUsers(users);

  // Determine the layout based on room type
  const isLargeHall = roomType === 'large_hall';

  return (
    <div className={`relative flex flex-col min-h-screen p-4 antialiased overflow-hidden ${themeClasses}`}>
      <div className="absolute inset-0 -z-10" ref={canvasRef}></div>
      <div className="absolute inset-0 bg-black opacity-60 -z-10"></div>

      {/* Gift Effects Layer */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {giftEffects.map(effect => (
          <div
            key={effect.id}
            className="gift-effect absolute text-4xl transform -translate-x-1/2"
            style={{
              left: effect.x,
              bottom: window.innerHeight - effect.y,
              opacity: effect.style.opacity,
              fontSize: effect.style.fontSize,
              transition: 'transform 0.1s linear, opacity 0.1s linear',
            }}
          >
            🎁
          </div>
        ))}
      </div>

      <header className="flex justify-between items-center p-4 rounded-3xl mb-4 shadow-lg bg-gray-900/50 backdrop-blur-sm z-20">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-800 transition-colors duration-200">
          <CornerUpLeft className="w-6 h-6 text-white" />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-xl font-extrabold text-white">غرفة المحادثة</h1>
          <p className="text-sm text-gray-400">ID: {roomId.substring(0, 8)}...</p>
        </div>
        <button className="p-2 rounded-full hover:bg-gray-800 transition-colors duration-200">
          <MoreHorizontal className="w-6 h-6 text-white" />
        </button>
      </header>

      <main className={`flex-1 flex flex-col md:flex-row-reverse z-10`}>
        {/* Chat Panel */}
        <CSSTransition
          in={showChat}
          timeout={300}
          classNames="chat-panel"
          unmountOnExit
        >
          <div className="chat-panel w-full md:w-96 bg-gray-950/90 backdrop-blur-md p-4 md:rounded-l-3xl flex flex-col transition-transform duration-300 ease-in-out border-l border-gray-800">
            <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">الدردشة العامة
              <button onClick={() => setShowChat(false)} className="md:hidden float-left text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </h3>
            <div className="flex-1 overflow-y-auto mb-4 custom-scrollbar">
              {isLoadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-blue-500"></div>
                </div>
              ) : (
                <TransitionGroup>
                  {messages.map((message) => (
                    <CSSTransition key={message.id} timeout={300} classNames="message-item">
                      <div className={`message-item flex flex-col mb-2 p-3 rounded-lg ${message.isAI ? 'bg-indigo-900/50 text-white self-start' : (message.senderId === userId ? 'bg-blue-600/50 text-white self-end' : 'bg-gray-800/50 text-gray-200 self-start')} `}>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <strong className="text-sm font-semibold">{message.senderName || 'مجهول'}</strong>
                          <span className="text-xs text-gray-400">{message.createdAt ? new Date(message.createdAt.seconds * 1000).toLocaleTimeString('ar-SA') : 'الآن'}</span>
                        </div>
                        <p className={`mt-1 text-sm ${message.isAI ? 'italic' : ''}`}>{message.text}</p>
                      </div>
                    </CSSTransition>
                  ))}
                </TransitionGroup>
              )}
              {isAILoading && (
                <div className="flex items-center justify-start p-3 rounded-lg bg-indigo-900/50 text-white mb-2">
                  <div className="w-4 h-4 border-2 border-dashed rounded-full animate-spin border-blue-500 mr-2"></div>
                  <p className="text-sm">المساعد الذكي يكتب...</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="flex space-x-2 space-x-reverse">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="أرسل رسالة..."
                className="flex-1 p-3 rounded-full bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="submit" disabled={isSendingMessage} className="p-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 disabled:bg-gray-700">
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </CSSTransition>

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col p-4 transition-all duration-300 ${showChat ? 'md:mr-96' : ''}`}>
          {/* Speakers Section */}
          <section className={`p-4 rounded-3xl mb-4 shadow-xl bg-gray-900/50 backdrop-blur-sm transition-all duration-300 ${isLargeHall ? 'h-56' : 'h-32'}`}>
            <h2 className="text-lg font-bold text-white mb-2 border-b border-gray-700 pb-2">المتحدثون ({speakers.length})</h2>
            <div className={`flex items-center space-x-4 overflow-x-auto ${isLargeHall ? 'justify-center' : ''}`}>
              {speakers.map(user => (
                <div key={user.id} className="flex flex-col items-center">
                  <div className={`w-20 h-20 rounded-full border-4 ${user.speaking ? 'border-green-400 animate-pulse-border' : 'border-gray-500'} transition-all duration-300 overflow-hidden`}>
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover rounded-full" />
                  </div>
                  <span className="text-sm mt-2 text-white">{user.name}</span>
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
            <button className="p-4 rounded-full bg-yellow-600 text-white shadow-lg transition-all duration-300 transform hover:scale-110" onClick={() => addGiftEffect('sparkles', 'You')}>
              <Gift className="w-8 h-8" />
            </button>
          </div>

          {/* Listeners Section */}
          <section className="p-4 rounded-3xl mt-auto shadow-xl bg-gray-900/50 backdrop-blur-sm h-32 overflow-hidden">
            <h2 className="text-lg font-bold text-white mb-2 border-b border-gray-700 pb-2">المستمعون ({listeners.length})</h2>
            <div className="flex items-center space-x-2 overflow-x-auto">
              {listeners.map(user => (
                <div key={user.id} className="flex flex-col items-center flex-shrink-0">
                  <div className="w-12 h-12 rounded-full border-2 border-gray-500 overflow-hidden">
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover rounded-full" />
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

export default VoiceChatRoom;
