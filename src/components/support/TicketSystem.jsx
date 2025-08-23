import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Send, Paperclip } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../context/AuthContext';
import { getTicketsPath } from '../../constants';

const TicketSystem = () => {
  const { t } = useTranslation();
  const { user, userProfile, db, storage, appId } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode, themeClasses } = useContext(ThemeContext);

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('technical');
  const [priority, setPriority] = useState('normal');
  const [attachments, setAttachments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);

  useEffect(() => {
    if (!user || !db) return;
    const ticketsPath = getTicketsPath(appId);
    const q = query(collection(db, ticketsPath), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedTickets = [];
      querySnapshot.forEach((doc) => {
        fetchedTickets.push({ id: doc.id, ...doc.data() });
      });
      setTickets(fetchedTickets);
      setIsLoadingTickets(false);
    });

    return () => unsubscribe();
  }, [user, db, appId]);

  const handleFileChange = (e) => {
    setAttachments([...e.target.files]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || !user) return;

    setIsSubmitting(true);
    setMessage('');

    try {
      const attachmentUrls = await Promise.all(
        attachments.map(async (file) => {
          const storageRef = ref(storage, `ticket_attachments/${user.uid}/${Date.now()}_${file.name}`);
          const uploadTask = await uploadBytesResumable(storageRef, file);
          return getDownloadURL(uploadTask.ref);
        })
      );

      await addDoc(collection(db, getTicketsPath(appId)), {
        userId: user.uid,
        userName: userProfile.name,
        userAvatar: userProfile.avatar,
        subject,
        description,
        category,
        priority,
        status: 'open',
        attachments: attachmentUrls,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setMessage('Ticket submitted successfully!');
      setSubject('');
      setDescription('');
      setAttachments([]);
    } catch (error) {
      console.error("Error submitting ticket:", error);
      setMessage('Failed to submit ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`flex flex-col min-h-screen p-4 antialiased ${themeClasses}`}>
      <header className={`flex items-center space-x-4 p-4 rounded-3xl mb-4 shadow-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-gray-700"><ArrowLeft /></button>
        <span className="text-2xl font-extrabold flex-1">{t('supportTickets')}</span>
      </header>
      <div className="flex-1 p-8 flex flex-col items-center">
        <div className={`w-full max-w-2xl p-8 rounded-3xl shadow-2xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <h2 className="text-2xl font-bold mb-6 text-center">{t('submitNewTicket')}</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">{t('subject')}</label>
              <input id="subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} required className="w-full input" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-2">{t('category')}</label>
                <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full input">
                  <option value="technical">Technical</option>
                  <option value="billing">Billing</option>
                  <option value="inquiry">Inquiry</option>
                </select>
              </div>
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-300 mb-2">{t('priority')}</label>
                <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full input">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">{t('description')}</label>
              <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required rows="5" className="w-full input"></textarea>
            </div>
            <div>
              <label htmlFor="attachments" className="block text-sm font-medium text-gray-300 mb-2">{t('attachments')}</label>
              <div className="flex items-center">
                <label htmlFor="file-upload" className="px-4 py-2 bg-gray-700 text-white rounded-lg cursor-pointer hover:bg-gray-600 flex items-center">
                  <Paperclip className="mr-2" size={16} /> {t('selectFiles')}
                </label>
                <input id="file-upload" type="file" multiple onChange={handleFileChange} className="hidden" />
                <span className="ml-4 text-sm text-gray-400">{attachments.length} file(s) selected</span>
              </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full py-3 px-6 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 flex items-center justify-center">
              <Send className="mr-2" size={18} />
              {isSubmitting ? t('submitting') : t('submitTicket')}
            </button>
          </form>
          {message && <p className="mt-4 text-center">{message}</p>}
        </div>

        <div className={`w-full max-w-4xl p-8 mt-8 rounded-3xl shadow-2xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <h2 className="text-2xl font-bold mb-6 text-center">{t('myTickets')}</h2>
          {isLoadingTickets ? (
            <p>Loading tickets...</p>
          ) : tickets.length > 0 ? (
            <div className="space-y-4">
              {tickets.map(ticket => (
                <div key={ticket.id} onClick={() => navigate(`/support/ticket/${ticket.id}`)}
                  className="p-4 rounded-lg bg-gray-800 hover:bg-gray-700 cursor-pointer"
                >
                  <div className="flex justify-between">
                    <p className="font-bold">{ticket.subject}</p>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      ticket.status === 'open' ? 'bg-green-500' :
                      ticket.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}>{ticket.status}</span>
                  </div>
                  <p className="text-sm text-gray-400">{ticket.category} - Priority: {ticket.priority}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">{t('noTicketsFound')}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketSystem;
