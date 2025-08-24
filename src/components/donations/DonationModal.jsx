import React, { useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Gift } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import { collection, addDoc, serverTimestamp, runTransaction, doc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { getTransactionsPath, getUserProfilePath } from '../../constants';

const DonationModal = ({ isOpen, onClose, recipient }) => {
  const { t } = useTranslation();
  const { user, userProfile, db, appId } = useAuth();
  const { isDarkMode } = useContext(ThemeContext);

  const [amount, setAmount] = useState(10);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleDonate = async (e) => {
    e.preventDefault();
    if (!user || !recipient || isSubmitting) return;

    if (userProfile.xp < amount) {
      setErrorMessage("You don't have enough XP to make this donation.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const senderRef = doc(db, getUserProfilePath(appId, user.uid));
    const recipientRef = doc(db, getUserProfilePath(appId, recipient.id));

    try {
      await runTransaction(db, async (transaction) => {
        const senderDoc = await transaction.get(senderRef);
        const recipientDoc = await transaction.get(recipientRef);

        if (!senderDoc.exists() || !recipientDoc.exists()) {
          throw "User profile not found.";
        }

        const newSenderXp = senderDoc.data().xp - amount;
        if (newSenderXp < 0) {
          throw "Insufficient XP.";
        }
        const newRecipientXp = recipientDoc.data().xp + amount;

        transaction.update(senderRef, { xp: newSenderXp });
        transaction.update(recipientRef, { xp: newRecipientXp });

        const transactionsRef = collection(db, getTransactionsPath(appId));
        transaction.set(doc(transactionsRef), {
          fromUserId: user.uid,
          toUserId: recipient.id,
          amount,
          message,
          createdAt: serverTimestamp(),
        });
      });

      sendNotification(recipient.id, 'donation_received', `${userProfile.name} sent you ${amount} XP!`, { fromUserId: user.uid, fromName: userProfile.name, amount });
      onClose();
    } catch (error) {
      console.error("Donation failed:", error);
      setErrorMessage(error.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`p-8 rounded-3xl shadow-2xl w-full max-w-md ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Donate to {recipient.name}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-800"><X /></button>
        </div>
        <form onSubmit={handleDonate} className="space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-2">Amount (XP)</label>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min="1"
              required
              className="w-full input"
            />
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">Message (optional)</label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows="3"
              className="w-full input"
            ></textarea>
          </div>
          {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
          <button type="submit" disabled={isSubmitting} className="w-full py-3 px-6 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 flex items-center justify-center">
            <Gift className="mr-2" size={18} />
            {isSubmitting ? 'Donating...' : `Donate ${amount} XP`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DonationModal;
