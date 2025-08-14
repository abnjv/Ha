import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, query, orderBy, addDoc, onSnapshot, serverTimestamp, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, where, getDocs, deleteDoc } from 'firebase/firestore';
import * as THREE from 'three';
import { LogIn, LogOut, Mic, MicOff, Users, Settings, Lock, CornerUpLeft, MessageSquare, User as UserIcon, Home, Zap, CornerUpRight, PhoneCall, PhoneMissed, Eye, Send, ArrowLeft, MoreHorizontal, UserCheck, Star, Moon, Sun, Plus, Search, CheckCircle, Smile, ThumbsUp, Gift, Sparkles, Heart, Bell, X, Trash2, UserPlus, UserMinus, Edit, Save, Globe, Gift as GiftIcon, UserMinus2, UserPlus2, Video, Volume2, UserCog, Send as SendIcon } from 'lucide-react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';

// ===================================================================================================================
// Firebase Configuration and Initialization (إعدادات وتهيئة Firebase)
// ===================================================================================================================

let app, auth, db;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const initializeFirebase = () => {
  try {
    const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
    if (Object.keys(firebaseConfig).length > 0 && !app) {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      console.log('Firebase initialized in React.');
    }
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
  }
};

// ===================================================================================================================
// Theme Context for UI Customization (سياق الثيم لتخصيص الواجهة)
// ===================================================================================================================

const ThemeContext = createContext();

const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  const themeClasses = isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-900';

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, themeClasses }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => useContext(ThemeContext);

// ===================================================================================================================
// Mock Data and Helper Functions (بيانات وهمية ووظائف مساعدة)
// ===================================================================================================================

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

const mockNotifications = [
  { id: 1, type: 'friendRequest', user: 'فاطمة', message: 'طلبت صداقتك.' },
  { id: 2, type: 'giftReceived', user: 'خالد', message: 'أرسل لك هدية 🎁.' },
  { id: 3, type: 'roomInvite', user: 'علي', message: 'دعاك للانضمام إلى غرفة "نقاشات تقنية".' },
];

const getLevelFromXP = (xp) => {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

// ===================================================================================================================
// Component for the Notification Panel (لوحة الإشعارات الجديدة)
// ===================================================================================================================

const NotificationPanel = ({ notifications, onClear, onToggle }) => {
  const { isDarkMode } = useTheme();

  return (
    <div className={`absolute top-0 right-0 h-full w-full md:w-96 bg-gray-950/90 backdrop-blur-md p-6 flex flex-col border-l border-gray-800 transition-transform duration-500 ease-in-out transform z-50`}>
      <div className="flex justify-between items-center pb-4 border-b border-gray-800">
        <h3 className="text-xl font-extrabold text-white">الإشعارات</h3>
        <button onClick={onToggle} className="p-2 rounded-full hover:bg-gray-800 transition-colors duration-200">
          <X className="w-6 h-6 text-white" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto my-4 space-y-4">
        {notifications.length > 0 ? (
          <TransitionGroup>
            {notifications.map((notification) => (
              <CSSTransition
                key={notification.id}
                timeout={300}
                classNames="notification-item"
              >
                <div className="flex items-center space-x-4 p-4 rounded-xl bg-gray-900 shadow-lg border border-gray-800 transform hover:scale-105 transition-all duration-300">
                  <div className="flex-shrink-0">
                    {notification.type === 'friendRequest' && <UserCheck className="w-8 h-8 text-green-500" />}
                    {notification.type === 'giftReceived' && <Gift className="w-8 h-8 text-yellow-500" />}
                    {notification.type === 'roomInvite' && <Users className="w-8 h-8 text-blue-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white">{notification.user}</p>
                    <p className="text-sm text-gray-400">{notification.message}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors duration-200">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>
              </CSSTransition>
            ))}
          </TransitionGroup>
        ) : (
          <div className="flex items-center justify-center h-full text-center text-gray-500">
            <p>لا توجد إشعارات جديدة.</p>
          </div>
        )}
      </div>
      {notifications.length > 0 && (
        <button onClick={onClear} className="w-full mt-4 p-3 rounded-full bg-red-600 text-white font-bold hover:bg-red-700 transition-colors duration-200 shadow-md transform hover:scale-105">
          مسح الكل
        </button>
      )}
    </div>
  );
};


// ===================================================================================================================
// Component for the Login Screen (شاشة تسجيل الدخول)
// Note: This component has been modified to bypass the login fields.
// ===================================================================================================================

const LoginScreen = ({ onLogin }) => {
  const { themeClasses } = useTheme();

  const handleLogin = (e) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className={`flex items-center justify-center min-h-screen p-4 ${themeClasses}`}>
      <div className="w-full max-w-md bg-gray-800 rounded-3xl shadow-2xl p-8 transform transition-all duration-300 hover:scale-[1.02]">
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-blue-600 rounded-full mb-4 shadow-lg">
            <LogIn className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">مرحباً!</h1>
          <p className="text-sm text-gray-400">اضغط للمتابعة</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <button
            type="submit"
            className="w-full py-3 px-6 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105"
          >
            تسجيل الدخول
          </button>
        </form>
        <div className="mt-8 text-center">
          <a href="#" className="text-sm text-blue-400 hover:underline">تجاوز تسجيل الدخول</a>
        </div>
      </div>
    </div>
  );
};

// ===================================================================================================================
// Component for the Home Screen (الشاشة الرئيسية) - Added Notification Toggle
// ===================================================================================================================

const HomeScreen = ({ onGoToRooms, onGoToPrivateChatList, onLogout, userId, onGoToProfile, onToggleNotifications, hasNotifications, onGoToFriendList }) => {
  const { isDarkMode, toggleDarkMode, themeClasses } = useTheme();

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex justify-between items-center p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-600 rounded-full">
            <Home className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-extrabold">AirChat</span>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200">
            {isDarkMode ? <Sun className="w-6 h-6 text-yellow-500" /> : <Moon className="w-6 h-6 text-gray-600" />}
          </button>
          <button onClick={onGoToProfile} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200" title="ملفي الشخصي">
            <UserIcon className="w-6 h-6 text-blue-500" />
          </button>
          <button onClick={onGoToFriendList} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200" title="أصدقائي">
            <Users className="w-6 h-6 text-pink-500" />
          </button>
          <button onClick={onToggleNotifications} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200 relative">
            <Bell className="w-6 h-6 text-white" />
            {hasNotifications && <span className="absolute top-1 right-1 block h-2 w-2 rounded-full ring-2 ring-gray-900 bg-red-500"></span>}
          </button>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-full font-bold shadow-lg hover:bg-red-700 transition-colors duration-200"
          >
            <LogOut className="w-4 h-4 inline-block ml-1" />
            تسجيل الخروج
          </button>
        </div>
      </header>

      <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
        <div className={`p-8 rounded-3xl shadow-2xl max-w-2xl w-full ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <h1 className="text-3xl md:text-4xl font-bold mb-6">مرحباً في AirChat!</h1>
          {userId && (
            <p className="text-sm text-center text-gray-400 mb-8">
              User ID: <span className="font-mono break-all">{userId}</span>
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <button
              onClick={onGoToRooms}
              className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl flex flex-col items-center justify-center transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg"
            >
              <Users className="w-10 h-10 mb-2" />
              <span className="text-xl font-bold">غرف المحادثة</span>
              <p className="text-sm text-blue-200 mt-1">انضم إلى غرف الدردشة الصوتية</p>
            </button>
            <button
              onClick={onGoToPrivateChatList}
              className="p-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl flex flex-col items-center justify-center transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-lg"
            >
              <MessageSquare className="w-10 h-10 mb-2" />
              <span className="text-xl font-bold">الدردشة الخاصة</span>
              <p className="text-sm text-purple-200 mt-1">تحدث مع أصدقائك مباشرة</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// ===================================================================================================================
// Component for Creating a New Room (واجهة إنشاء غرفة جديدة)
// ===================================================================================================================
const CreateRoomScreen = ({ onBack, userId, userProfile, onRoomCreated }) => {
  const [roomTitle, setRoomTitle] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { themeClasses } = useTheme();

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!roomTitle || !roomDescription || isLoading || !db) return;

    setIsLoading(true);
    try {
      const roomsCollectionRef = collection(db, `/artifacts/${appId}/public/data/rooms`);
      const newRoom = {
        title: roomTitle,
        description: roomDescription,
        creatorId: userId,
        creatorName: userProfile?.name || 'مجهول',
        isLocked: false,
        roomType: 'large_hall', // Default to large_hall
        createdAt: serverTimestamp(),
      };
      await addDoc(roomsCollectionRef, newRoom);
      onRoomCreated();
    } catch (error) {
      console.error("Error creating new room:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${themeClasses === 'bg-gray-950 text-white' ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200">
          <CornerUpLeft className="w-6 h-6" />
        </button>
        <span className="text-2xl font-extrabold flex-1">إنشاء غرفة جديدة</span>
      </header>

      <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
        <div className={`w-full max-w-lg p-8 rounded-3xl shadow-2xl ${themeClasses === 'bg-gray-950 text-white' ? 'bg-gray-900' : 'bg-white'}`}>
          <form onSubmit={handleCreateRoom} className="space-y-6">
            <div>
              <label htmlFor="roomTitle" className="block text-sm font-medium text-gray-300 mb-2">اسم الغرفة</label>
              <input
                id="roomTitle"
                type="text"
                value={roomTitle}
                onChange={(e) => setRoomTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                placeholder="أدخل اسمًا للغرفة"
              />
            </div>
            <div>
              <label htmlFor="roomDescription" className="block text-sm font-medium text-gray-300 mb-2">وصف الغرفة</label>
              <textarea
                id="roomDescription"
                value={roomDescription}
                onChange={(e) => setRoomDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                placeholder="أدخل وصفًا للغرفة"
                rows="4"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition duration-300 transform hover:scale-105 disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              {isLoading ? 'جارٍ الإنشاء...' : 'إنشاء الغرفة'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};


// ===================================================================================================================
// Component for the Main Dashboard (Rooms List) (قائمة الغرف)
// Now fetches rooms from Firestore and includes a Create Room button.
// ===================================================================================================================

const MainDashboard = ({ onJoinRoom, onBack, userId, onCreateRoom }) => {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isDarkMode, themeClasses } = useTheme();

  useEffect(() => {
    if (!db) return;
    const roomsCollectionRef = collection(db, `/artifacts/${appId}/public/data/rooms`);
    const q = query(roomsCollectionRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedRooms = [];
      querySnapshot.forEach((doc) => {
        fetchedRooms.push({ id: doc.id, ...doc.data() });
      });
      setRooms(fetchedRooms);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching rooms:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex justify-between items-center p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200">
          <CornerUpLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-extrabold">غرف المحادثة</span>
        </div>
        <button onClick={onCreateRoom} className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors duration-200">
          <Plus className="w-6 h-6 text-white" />
        </button>
      </header>

      <div className="flex-1 p-8">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">اختر غرفتك الفضائية</h1>
        {userId && (
          <p className="text-sm text-center text-gray-400 mb-8">
            User ID: <span className="font-mono break-all">{userId}</span>
          </p>
        )}
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {rooms.map((room) => (
              <div
                key={room.id}
                className={`p-6 rounded-3xl shadow-xl border-t-2 border-blue-500 transition-all duration-300 transform hover:scale-105 ${room.isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-2xl'} ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
              >
                <h2 className="text-xl md:text-2xl font-bold mb-2">{room.title}</h2>
                <p className="text-sm text-gray-400 mb-4">{room.description}</p>
                <button
                  onClick={() => onJoinRoom(room.id, room.roomType)}
                  disabled={room.isLocked}
                  className={`w-full py-3 px-6 rounded-full font-bold text-white transition-all duration-300 shadow-lg flex items-center justify-center ${
                    room.isLocked
                      ? 'bg-gray-700 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {room.isLocked ? (
                    <>
                      <Lock className="w-5 h-5 ml-2" />
                      قريباً
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 ml-2" />
                      دخول الغرفة
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


// ===================================================================================================================
// Component for the Voice Chat Room with integrated Text Chat - NEW FANTASY UI (واجهة خيالية جديدة)
// Now supports dynamic layouts based on 'roomType' prop and XP gain.
// ===================================================================================================================
const VoiceChatRoom = ({ onBack, userId, roomId, userProfile, setUserProfile, roomType }) => {
  const [users, setUsers] = useState(voiceChatUsers);
  const [isMuted, setIsMuted] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const { themeClasses } = useTheme();
  const currentUser = userProfile;
  const [isAILoading, setIsAILoading] = useState(false);

  // THREE.js Scene Refs
  const canvasRef = useRef();
  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef(new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000));
  const rendererRef = useRef(new THREE.WebGLRenderer({ alpha: true, antialias: true }));
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
  }, [roomId, userId]);

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
    const apiKey = "";
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
                <SendIcon className="w-5 h-5" />
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


// ===================================================================================================================
// Component for the Private Chat List (قائمة الدردشات الخاصة)
// ===================================================================================================================
const PrivateChatList = ({ onBack, onOpenChat, userId }) => {
  const { isDarkMode, themeClasses } = useTheme();
  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !userId) return;

    const privateDataPath = `/artifacts/${appId}/users/${userId}/friends`;
    const friendsCollectionRef = collection(db, privateDataPath);
    const q = query(friendsCollectionRef);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedFriends = [];
      querySnapshot.forEach((doc) => {
        fetchedFriends.push({ id: doc.id, ...doc.data() });
      });
      setFriends(fetchedFriends);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching friends list:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200">
          <CornerUpLeft className="w-6 h-6" />
        </button>
        <span className="text-2xl font-extrabold flex-1">الدردشة الخاصة</span>
      </header>

      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">أصدقائي</h1>
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-blue-500"></div>
          </div>
        ) : friends.length > 0 ? (
          <div className="space-y-4">
            {friends.map(friend => (
              <div key={friend.id} className={`flex items-center p-4 rounded-2xl shadow-md transition-colors duration-200 ${isDarkMode ? 'bg-gray-900 hover:bg-gray-800' : 'bg-white hover:bg-gray-100'}`}>
                <div className="flex-1 flex items-center space-x-4 space-x-reverse">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <img src={friend.avatar || `https://placehold.co/48x48/${Math.floor(Math.random()*16777215).toString(16)}/FFFFFF?text=${friend.name.charAt(0)}`} alt={friend.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="font-bold">{friend.name}</span>
                </div>
                <button
                  onClick={() => onOpenChat(friend.id, friend.name)}
                  className="py-2 px-4 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-colors duration-200"
                >
                  <MessageSquare className="w-5 h-5 inline-block" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-10">
            <p>لا يوجد أصدقاء حالياً.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ===================================================================================================================
// Component for the Actual Private Chat (دردشة خاصة)
// ===================================================================================================================
const PrivateChat = ({ onBack, userId, friendId, friendName, userProfile }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const { isDarkMode, themeClasses } = useTheme();

  useEffect(() => {
    if (!db || !userId) return;

    const chatPartners = [userId, friendId].sort().join('_');
    const privateChatPath = `/artifacts/${appId}/public/data/private_chats/${chatPartners}/messages`;
    const q = query(collection(db, privateChatPath), orderBy('createdAt'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedMessages = [];
      querySnapshot.forEach((doc) => {
        fetchedMessages.push({ id: doc.id, ...doc.data() });
      });
      setMessages(fetchedMessages);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching private messages:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId, friendId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (inputMessage.trim() === '' || !db || isSendingMessage) return;

    setIsSendingMessage(true);
    const chatPartners = [userId, friendId].sort().join('_');
    const privateChatPath = `/artifacts/${appId}/public/data/private_chats/${chatPartners}/messages`;
    
    try {
      await addDoc(collection(db, privateChatPath), {
        senderId: userId,
        text: inputMessage,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending private message:", error);
    }
    
    setInputMessage('');
    setIsSendingMessage(false);
  };

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200">
          <CornerUpLeft className="w-6 h-6" />
        </button>
        <span className="text-2xl font-extrabold flex-1">{friendName}</span>
      </header>

      <div className={`flex-1 flex flex-col p-4 rounded-3xl shadow-xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="flex-1 overflow-y-auto mb-4 p-4 space-y-4 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="w-8 h-8 border-2 border-dashed rounded-full animate-spin border-blue-500"></div>
            </div>
          ) : (
            <TransitionGroup>
              {messages.map((message) => (
                <CSSTransition key={message.id} timeout={300} classNames="message-item">
                  <div className={`message-item flex ${message.senderId === userId ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs md:max-w-md p-3 rounded-xl shadow-md ${message.senderId === userId ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'}`}>
                      <p>{message.text}</p>
                      <span className={`block mt-1 text-xs ${message.senderId === userId ? 'text-blue-200' : 'text-gray-500'}`}>
                        {message.createdAt ? new Date(message.createdAt.seconds * 1000).toLocaleTimeString('ar-SA') : 'الآن'}
                      </span>
                    </div>
                  </div>
                </CSSTransition>
              ))}
            </TransitionGroup>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="flex space-x-2 space-x-reverse border-t border-gray-700 pt-4">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="أرسل رسالة..."
            className="flex-1 p-3 rounded-full bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" disabled={isSendingMessage} className="p-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 disabled:bg-gray-700">
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};


// ===================================================================================================================
// Component for the Friend List (قائمة الأصدقاء) - NEW
// ===================================================================================================================
const FriendList = ({ onBack, userId, onAddFriend, onRemoveFriend }) => {
  const { isDarkMode, themeClasses } = useTheme();
  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !userId) return;
    const friendsCollectionRef = collection(db, `/artifacts/${appId}/users/${userId}/friends`);
    const q = query(friendsCollectionRef);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedFriends = [];
      querySnapshot.forEach(doc => {
        fetchedFriends.push({ id: doc.id, ...doc.data() });
      });
      setFriends(fetchedFriends);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching friends:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200">
          <CornerUpLeft className="w-6 h-6" />
        </button>
        <span className="text-2xl font-extrabold flex-1">قائمة الأصدقاء</span>
        <button onClick={onAddFriend} className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors duration-200">
          <UserPlus className="w-6 h-6 text-white" />
        </button>
      </header>
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">أصدقائي</h1>
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-blue-500"></div>
          </div>
        ) : friends.length > 0 ? (
          <div className="space-y-4">
            {friends.map(friend => (
              <div key={friend.id} className={`flex items-center p-4 rounded-2xl shadow-md transition-colors duration-200 ${isDarkMode ? 'bg-gray-900 hover:bg-gray-800' : 'bg-white hover:bg-gray-100'}`}>
                <div className="flex-1 flex items-center space-x-4 space-x-reverse">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <img src={friend.avatar || `https://placehold.co/48x48/${Math.floor(Math.random()*16777215).toString(16)}/FFFFFF?text=${friend.name.charAt(0)}`} alt={friend.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="font-bold">{friend.name}</span>
                </div>
                <button
                  onClick={() => onRemoveFriend(friend.id)}
                  className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors duration-200"
                >
                  <UserMinus className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-10">
            <p>لا يوجد أصدقاء. أضف أصدقاءك الآن!</p>
          </div>
        )}
      </div>
    </div>
  );
};


// ===================================================================================================================
// Component for the Add Friend Screen (واجهة إضافة صديق) - NEW
// ===================================================================================================================
const AddFriendScreen = ({ onBack, userId }) => {
  const { isDarkMode, themeClasses } = useTheme();
  const [friendUserId, setFriendUserId] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddFriend = async (e) => {
    e.preventDefault();
    if (!friendUserId.trim() || !db || isLoading) return;

    setIsLoading(true);
    setMessage('');

    if (friendUserId === userId) {
      setMessage('لا يمكنك إضافة نفسك كصديق.');
      setIsLoading(false);
      return;
    }

    try {
      // Check if friend exists (optional but good practice)
      const friendProfileRef = doc(db, `/artifacts/${appId}/users/${friendUserId}/profile`, 'data');
      const docSnap = await getDoc(friendProfileRef);

      if (!docSnap.exists()) {
        setMessage('لم يتم العثور على مستخدم بهذا المعرف.');
        setIsLoading(false);
        return;
      }

      // Add to current user's friend list
      const userFriendDocRef = doc(db, `/artifacts/${appId}/users/${userId}/friends`, friendUserId);
      await setDoc(userFriendDocRef, {
        name: docSnap.data().name || 'مجهول',
        avatar: docSnap.data().avatar || `https://placehold.co/48x48/${Math.floor(Math.random()*16777215).toString(16)}/FFFFFF?text=${(docSnap.data().name || 'م').charAt(0)}`,
        addedAt: serverTimestamp(),
      });

      // Add current user to friend's friend list
      const friendFriendDocRef = doc(db, `/artifacts/${appId}/users/${friendUserId}/friends`, userId);
      // You should fetch the current user's profile to add their name/avatar
      const userProfileRef = doc(db, `/artifacts/${appId}/users/${userId}/profile`, 'data');
      const userProfileSnap = await getDoc(userProfileRef);
      if (userProfileSnap.exists()) {
        await setDoc(friendFriendDocRef, {
          name: userProfileSnap.data().name || 'مجهول',
          avatar: userProfileSnap.data().avatar || `https://placehold.co/48x48/${Math.floor(Math.random()*16777215).toString(16)}/FFFFFF?text=${(userProfileSnap.data().name || 'م').charAt(0)}`,
          addedAt: serverTimestamp(),
        });
      }


      setMessage('تمت إضافة الصديق بنجاح!');
      setFriendUserId('');
    } catch (error) {
      console.error("Error adding friend:", error);
      setMessage('حدث خطأ أثناء إضافة الصديق.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200">
          <CornerUpLeft className="w-6 h-6" />
        </button>
        <span className="text-2xl font-extrabold flex-1">إضافة صديق</span>
      </header>

      <div className="flex-1 p-8 flex flex-col items-center justify-center">
        <div className={`w-full max-w-lg p-8 rounded-3xl shadow-2xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <form onSubmit={handleAddFriend} className="space-y-6">
            <div>
              <label htmlFor="friendUserId" className="block text-sm font-medium text-gray-300 mb-2">معرف المستخدم (User ID)</label>
              <input
                id="friendUserId"
                type="text"
                value={friendUserId}
                onChange={(e) => setFriendUserId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                placeholder="أدخل معرف المستخدم"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition duration-300 transform hover:scale-105 disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              {isLoading ? 'جارٍ الإضافة...' : 'إضافة صديق'}
            </button>
          </form>
          {message && (
            <div className={`mt-4 p-4 rounded-xl text-center ${message.includes('بنجاح') ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
              <p>{message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// ===================================================================================================================
// Component for the User Profile (الملف الشخصي للمستخدم)
// ===================================================================================================================
const UserProfileScreen = ({ onBack, userId, userProfile, setUserProfile }) => {
  const { isDarkMode, themeClasses } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [newUserName, setNewUserName] = useState(userProfile?.name || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setNewUserName(userProfile.name);
    }
  }, [userProfile]);

  const handleSaveProfile = async () => {
    if (!db || !userId || !newUserName.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const userDocRef = doc(db, `/artifacts/${appId}/users/${userId}/profile`, 'data');
      await setDoc(userDocRef, {
        ...userProfile,
        name: newUserName,
      }, { merge: true });
      setUserProfile(prev => ({ ...prev, name: newUserName }));
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating user profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const level = getLevelFromXP(userProfile?.xp || 0);
  const xpForNextLevel = (level + 1) * (level + 1) * 100 - (level * level * 100);
  const xpProgress = ((userProfile?.xp || 0) - (level * level * 100)) / 100;
  const progressPercentage = (userProfile?.xp - (level * level * 100)) / xpForNextLevel * 100;

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200">
          <CornerUpLeft className="w-6 h-6" />
        </button>
        <span className="text-2xl font-extrabold flex-1">الملف الشخصي</span>
        <button onClick={() => setIsEditing(!isEditing)} className="p-2 rounded-full hover:bg-gray-700 transition-colors duration-200">
          {isEditing ? <X className="w-6 h-6 text-red-500" /> : <Edit className="w-6 h-6 text-blue-500" />}
        </button>
      </header>

      <div className="flex-1 p-8 flex flex-col items-center">
        <div className={`w-full max-w-lg p-8 rounded-3xl shadow-2xl text-center ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <div className="relative w-32 h-32 mx-auto mb-4 rounded-full border-4 border-purple-500 overflow-hidden">
            <img src={userProfile?.avatar || `https://placehold.co/128x128/6B46C1/FFFFFF?text=${(userProfile?.name || 'م').charAt(0)}`} alt="Avatar" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
              <Plus className="w-8 h-8 text-white" />
            </div>
          </div>
          {isEditing ? (
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="w-full text-center text-3xl font-bold bg-gray-700 text-white rounded-xl py-2 px-4 focus:outline-none"
            />
          ) : (
            <h2 className="text-3xl font-bold mb-2">{userProfile?.name || 'مستخدم جديد'}</h2>
          )}
          <p className="text-sm text-gray-400 mb-4 break-all">ID: {userId}</p>

          {isEditing && (
            <button onClick={handleSaveProfile} disabled={isLoading} className="mt-4 py-2 px-6 bg-green-600 text-white rounded-full font-bold hover:bg-green-700 transition-colors duration-200 disabled:bg-gray-700">
              {isLoading ? 'جارٍ الحفظ...' : <Save className="w-5 h-5" />}
            </button>
          )}

          <div className="mt-8">
            <h3 className="text-lg font-bold mb-2">المستوى والخبرة</h3>
            <div className="flex items-center justify-center mb-2">
              <span className="text-4xl font-extrabold text-purple-500">{level}</span>
              <span className="text-lg font-semibold ml-2">مستوى</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
              <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
            </div>
            <p className="text-sm text-gray-400">{userProfile?.xp || 0} XP / {xpForNextLevel + (level * level * 100)} XP للمستوى التالي</p>
          </div>
        </div>
      </div>
    </div>
  );
};


// ===================================================================================================================
// Main App Component (المكون الرئيسي للتطبيق)
// ===================================================================================================================

const App = () => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [currentPage, setCurrentPage] = useState('login');
  const [roomId, setRoomId] = useState(null);
  const [roomType, setRoomType] = useState('large_hall');
  const [privateChatFriendId, setPrivateChatFriendId] = useState(null);
  const [privateChatFriendName, setPrivateChatFriendName] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  const { themeClasses } = useTheme();

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  useEffect(() => {
    initializeFirebase();
    if (auth) {
      const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
      if (initialAuthToken) {
        signInWithCustomToken(auth, initialAuthToken).catch(error => {
          console.error("Error signing in with custom token:", error);
          signInAnonymously(auth).catch(e => console.error("Anonymous sign-in failed:", e));
        });
      } else {
        signInAnonymously(auth).catch(e => console.error("Anonymous sign-in failed:", e));
      }

      const unsubscribe = onAuthStateChanged(auth, (authUser) => {
        if (authUser) {
          setUser(authUser);
          fetchUserProfile(authUser.uid);
          setCurrentPage('home');
        } else {
          setUser(null);
          setUserProfile(null);
          setCurrentPage('login');
        }
      });
      return () => unsubscribe();
    }
  }, []);

  const fetchUserProfile = async (userId) => {
    if (!db) return;
    const userDocRef = doc(db, `/artifacts/${appId}/users/${userId}/profile`, 'data');
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      setUserProfile(docSnap.data());
    } else {
      // Create a default profile if it doesn't exist
      const defaultProfile = {
        name: `مستخدم_${userId.substring(0, 4)}`,
        avatar: `https://placehold.co/128x128/${Math.floor(Math.random()*16777215).toString(16)}/FFFFFF?text=${'م'}`,
        xp: 0,
        createdAt: serverTimestamp(),
      };
      await setDoc(userDocRef, defaultProfile);
      setUserProfile(defaultProfile);
    }
  };

  const handleLogin = () => {
    setCurrentPage('home');
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentPage('login');
  };

  const handleJoinRoom = (id, type) => {
    setRoomId(id);
    setRoomType(type);
    setCurrentPage('voice-chat-room');
  };

  const handleOpenPrivateChat = (friendId, friendName) => {
    setPrivateChatFriendId(friendId);
    setPrivateChatFriendName(friendName);
    setCurrentPage('private-chat');
  };

  const hasNotifications = notifications.length > 0;

  let content;
  switch (currentPage) {
    case 'login':
      content = <LoginScreen onLogin={handleLogin} />;
      break;
    case 'home':
      content = <HomeScreen
        onGoToRooms={() => setCurrentPage('dashboard')}
        onGoToPrivateChatList={() => setCurrentPage('private-chat-list')}
        onLogout={handleLogout}
        userId={user?.uid}
        onGoToProfile={() => setCurrentPage('profile')}
        onToggleNotifications={() => setShowNotifications(!showNotifications)}
        hasNotifications={hasNotifications}
        onGoToFriendList={() => setCurrentPage('friend-list')}
      />;
      break;
    case 'dashboard':
      content = <MainDashboard
        onJoinRoom={handleJoinRoom}
        onBack={() => setCurrentPage('home')}
        userId={user?.uid}
        onCreateRoom={() => setCurrentPage('create-room')}
      />;
      break;
    case 'create-room':
      content = <CreateRoomScreen
        onBack={() => setCurrentPage('dashboard')}
        userId={user?.uid}
        userProfile={userProfile}
        onRoomCreated={() => setCurrentPage('dashboard')}
      />;
      break;
    case 'voice-chat-room':
      content = <VoiceChatRoom
        onBack={() => setCurrentPage('dashboard')}
        userId={user?.uid}
        roomId={roomId}
        userProfile={userProfile}
        setUserProfile={setUserProfile}
        roomType={roomType}
      />;
      break;
    case 'private-chat-list':
      content = <PrivateChatList
        onBack={() => setCurrentPage('home')}
        onOpenChat={handleOpenPrivateChat}
        userId={user?.uid}
      />;
      break;
    case 'private-chat':
      content = <PrivateChat
        onBack={() => setCurrentPage('private-chat-list')}
        userId={user?.uid}
        friendId={privateChatFriendId}
        friendName={privateChatFriendName}
        userProfile={userProfile}
      />;
      break;
    case 'friend-list':
      content = <FriendList
        onBack={() => setCurrentPage('home')}
        userId={user?.uid}
        onAddFriend={() => setCurrentPage('add-friend')}
        onRemoveFriend={() => {}} // Placeholder for now
      />;
      break;
    case 'add-friend':
      content = <AddFriendScreen
        onBack={() => setCurrentPage('friend-list')}
        userId={user?.uid}
      />;
      break;
    case 'profile':
      content = <UserProfileScreen
        onBack={() => setCurrentPage('home')}
        userId={user?.uid}
        userProfile={userProfile}
        setUserProfile={setUserProfile}
      />;
      break;
    default:
      content = <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <ThemeProvider>
      <div className={`min-h-screen ${themeClasses} antialiased`}>
        {content}
        {showNotifications && (
          <CSSTransition in={showNotifications} timeout={500} classNames="notification-panel">
            <NotificationPanel
              notifications={notifications}
              onClear={handleClearNotifications}
              onToggle={() => setShowNotifications(false)}
            />
          </CSSTransition>
        )}
      </div>
    </ThemeProvider>
  );
};

export default App;
