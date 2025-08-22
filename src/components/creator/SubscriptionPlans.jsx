import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

const plans = [
  {
    name: 'Basic Tier',
    price: '$5',
    period: '/month',
    features: [
      'Access to one creator of your choice',
      'Basic chat badge',
      'Standard support',
    ],
    buttonText: 'Select Basic',
  },
  {
    name: 'Premium Tier',
    price: '$15',
    period: '/month',
    features: [
      'Access to five creators',
      'Premium chat badge',
      'Priority support',
      'Access to exclusive monthly content',
    ],
    buttonText: 'Choose Premium',
    isPopular: true,
  },
  {
    name: 'VIP Tier',
    price: '$30',
    period: '/month',
    features: [
      'Unlimited access to all creators',
      'VIP chat badge & effects',
      '24/7 dedicated support',
      'Early access to new features',
      'Direct line to suggest features',
    ],
    buttonText: 'Go VIP',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
  },
};

const SubscriptionPlans = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubscribe = async (planName) => {
    setIsProcessing(true);
    alert(`Redirecting to test payment gateway for ${planName}...`);

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    alert(`Payment successful! Your subscription to ${planName} is now active.`);
    // In a real app, you would now update the user's subscription status in Firestore
    // and Redux state.
    setIsProcessing(false);
  };

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Choose Your Plan</h1>
        <p className="text-lg text-gray-400">Support your favorite creators and unlock exclusive content.</p>
      </motion.div>
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {plans.map((plan) => (
          <motion.div
            key={plan.name}
            variants={itemVariants}
            className={`relative bg-gray-800 rounded-2xl p-8 flex flex-col shadow-lg
                        ${plan.isPopular ? 'border-2 border-blue-500' : 'border border-gray-700'}`}
          >
            {plan.isPopular && (
              <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">Most Popular</span>
              </div>
            )}
            <h2 className="text-2xl font-bold text-center mb-2">{plan.name}</h2>
            <div className="text-center mb-6">
              <span className="text-5xl font-bold">{plan.price}</span>
              <span className="text-gray-400">{plan.period}</span>
            </div>
            <ul className="space-y-4 mb-8 flex-grow">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-green-400 mr-2 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <motion.button
              onClick={() => handleSubscribe(plan.name)}
              disabled={isProcessing}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`w-full p-3 rounded-lg font-bold text-lg
                          ${plan.isPopular ? 'bg-blue-600' : 'bg-gray-700'}
                          ${isProcessing ? 'cursor-wait bg-gray-500' : 'hover:bg-blue-700 hover:bg-gray-600'}`}
            >
              {isProcessing ? 'Processing...' : plan.buttonText}
            </motion.button>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default SubscriptionPlans;
