import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, Clock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { mockProperties } from '../data/mock';

export function BookingPage() {
  const property = mockProperties[0]; // Hardcode to first for demo
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const dates = [
    { day: 'Mon', date: '24', month: 'Oct' },
    { day: 'Tue', date: '25', month: 'Oct' },
    { day: 'Wed', date: '26', month: 'Oct' },
    { day: 'Thu', date: '27', month: 'Oct' },
    { day: 'Fri', date: '28', month: 'Oct' },
  ];

  const times = ['09:00 AM', '10:00 AM', '11:30 AM', '02:00 PM', '04:00 PM'];

  const handleConfirm = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(2);
    }, 1500);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-blueprint opacity-20 pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-xl border border-gray-100 max-w-lg w-full overflow-hidden relative z-10"
      >
        {step === 1 ? (
          <div>
            <div className="p-6 border-b border-gray-100 flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-900 transition-colors">
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-xl font-bold text-gray-900">Book Inspection</h2>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Property Snapshot */}
              <div className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <img src={property.images[0]} alt={property.title} className="w-20 h-20 rounded-xl object-cover" />
                <div>
                  <h4 className="font-semibold text-gray-900 line-clamp-1">{property.title}</h4>
                  <p className="text-sm text-gray-500 mt-1">{property.location}</p>
                  <p className="text-xs text-primary font-medium mt-2">{property.landlord.name}</p>
                </div>
              </div>

              {/* Date Selection */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CalendarIcon size={16} className="text-primary" /> Select Date
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {dates.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(d.date)}
                      className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-xl border transition-all ${
                        selectedDate === d.date 
                          ? 'border-primary bg-primary text-white shadow-md' 
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xs mb-1">{d.day}</span>
                      <span className="text-xl font-bold">{d.date}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock size={16} className="text-primary" /> Select Time
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {times.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedTime(t)}
                        className={`py-2 text-sm font-medium rounded-lg border transition-all ${
                          selectedTime === t
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Confirm Button */}
              <div className="pt-4 border-t border-gray-100">
                <Button 
                  fullWidth 
                  size="lg" 
                  disabled={!selectedDate || !selectedTime}
                  onClick={handleConfirm}
                  isLoading={isLoading}
                >
                  Confirm Booking
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-10 text-center">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 size={40} />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Inspection Booked!</h2>
            <p className="text-gray-600 mb-8 max-w-xs mx-auto">
              Your inspection for {property.title} is confirmed for {selectedDate} Oct at {selectedTime}.
            </p>
            <div className="flex flex-col gap-3">
              <Link to="/dashboard/tenant">
                <Button fullWidth variant="outline">Go to Dashboard</Button>
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
