import React from 'react';

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

const SubscriptionPlans = () => {
  const handleSubscribe = (planName) => {
    // Placeholder for payment gateway integration (Stripe, PayPal, etc.)
    alert(`Subscribing to ${planName} is not implemented yet. This would open a payment modal.`);
  };

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Choose Your Plan</h1>
        <p className="text-lg text-gray-400">Support your favorite creators and unlock exclusive content.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`bg-gray-800 rounded-2xl p-8 flex flex-col shadow-lg transition-transform transform hover:scale-105
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
                  <svg className="w-6 h-6 text-green-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe(plan.name)}
              className={`w-full p-3 rounded-lg font-bold text-lg
                          ${plan.isPopular ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              {plan.buttonText}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPlans;
