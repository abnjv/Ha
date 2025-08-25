import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const SubscriptionSystem = () => {
  const { updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(null); // To track loading state for each button

  const plans = [
    {
      id: 'basic',
      name: 'الاشتراك الأساسي',
      price: 15,
      features: ['دردشة غير محدودة', '5 غرف صوتية']
    },
    {
      id: 'premium',
      name: 'الاشتراك المتميز',
      price: 30,
      features: ['بث مباشر', 'غرف غير محدودة', 'دعم مميز']
    }
  ];

  const simulatePayment = () => {
    return new Promise((resolve) => {
      // Simulate a successful payment after 1 second
      setTimeout(() => resolve(true), 1000);
    });
  };

  const subscribe = async (planId) => {
    setIsLoading(planId);
    // Simulate payment process
    const paymentSuccess = await simulatePayment();

    if (paymentSuccess) {
      try {
        // Update user's profile in Firebase
        await updateUserProfile({
          subscription: {
            planId: planId,
            status: 'active',
            subscribedAt: new Date().toISOString(),
          }
        });
        alert('تم الاشتراك بنجاح!');
        navigate('/profile'); // Navigate to profile page after subscription
      } catch (error) {
        console.error("Failed to update profile with subscription:", error);
        alert('فشل الاشتراك. الرجاء المحاولة مرة أخرى.');
      }
    } else {
      alert('فشلت عملية الدفع الوهمية.');
    }
    setIsLoading(null);
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen p-4 flex flex-col items-center">
        <div className="w-full max-w-4xl mx-auto">
            <div className="flex justify-start w-full mb-6">
                <button onClick={() => navigate('/profile')} className="p-2 rounded-full hover:bg-gray-800">
                    <ArrowLeft className="w-6 h-6" />
                </button>
            </div>
            <h1 className="text-3xl font-bold text-center mb-8">اختر خطة الاشتراك</h1>
            <p className="text-center text-gray-400 mb-8">هذا النظام هو لأغراض العرض فقط ولا يتضمن أي مدفوعات حقيقية.</p>

            <div className="subscription-plans grid grid-cols-1 md:grid-cols-2 gap-8">
                {plans.map((plan) => (
                    <div key={plan.id} className="plan bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col">
                        <h3 className="text-2xl font-bold mb-4 text-blue-400">{plan.name}</h3>
                        <p className="price text-4xl font-extrabold mb-4">{plan.price} <span className="text-lg font-normal text-gray-400">ريال/شهر</span></p>
                        <ul className="features list-disc list-inside mb-6 text-gray-300 flex-grow">
                            {plan.features.map((feature, index) => (
                                <li key={index} className="mb-2">{feature}</li>
                            ))}
                        </ul>
                        <button
                            onClick={() => subscribe(plan.id)}
                            disabled={isLoading === plan.id}
                            className="mt-auto w-full py-3 px-6 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition duration-300 disabled:bg-gray-500"
                        >
                            {isLoading === plan.id ? 'جاري المعالجة...' : 'اشترك الآن'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default SubscriptionSystem;
