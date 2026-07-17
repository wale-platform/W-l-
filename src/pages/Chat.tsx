import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Send, Phone, Video, MoreVertical, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mockLandlords } from '../data/mock';

export function ChatPage() {
  const { user } = useAuth();
  const landlord = mockLandlords[0];
  const [message, setMessage] = useState('');
  
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm interested in the Premium Studio Apartment at Tanke.", sender: 'tenant', time: '10:00 AM' },
    { id: 2, text: "Hi there! Thanks for your interest. The apartment is still available and very close to the UNILORIN gate. When would you like to come for an inspection?", sender: 'landlord', time: '10:15 AM' },
    { id: 3, text: "Is tomorrow morning okay? Around 10 AM?", sender: 'tenant', time: '10:17 AM' },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setMessages([...messages, {
      id: Date.now(),
      text: message,
      sender: 'tenant',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setMessage('');
  };

  return (
    <div className="min-h-screen pt-20 pb-0 bg-gray-50 flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex-grow flex flex-col h-[calc(100vh-80px)]">
        
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-100 shadow-sm flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <Link to="/properties" className="text-gray-400 hover:text-gray-900 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={landlord.avatar} alt={landlord.name} className="w-10 h-10 rounded-full object-cover" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <h3 className="font-semibold text-gray-900 leading-none">{landlord.name}</h3>
                  <ShieldCheck size={14} className="text-primary" />
                </div>
                <span className="text-xs text-gray-500">Typically replies {landlord.responseTime}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            <button className="hover:text-primary transition-colors"><Phone size={20} /></button>
            <button className="hover:text-primary transition-colors"><Video size={20} /></button>
            <button className="hover:text-gray-900 transition-colors"><MoreVertical size={20} /></button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-grow p-6 overflow-y-auto bg-gray-50 space-y-6">
          <div className="text-center">
            <span className="text-xs text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">Today</span>
          </div>

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'tenant' ? 'justify-end' : 'justify-start'}`}>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                  msg.sender === 'tenant' 
                    ? 'bg-primary text-white rounded-tr-sm' 
                    : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'
                }`}
              >
                <p className="text-sm md:text-base">{msg.text}</p>
                <div className={`text-[10px] mt-2 text-right ${msg.sender === 'tenant' ? 'text-primary-100' : 'text-gray-400'}`}>
                  {msg.time}
                </div>
              </motion.div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="bg-white p-4 border-t border-gray-100">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-grow bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
            <button 
              type="submit"
              className="bg-primary text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-50"
              disabled={!message.trim()}
            >
              <Send size={20} className="ml-1" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
