import React from 'react';
import { motion } from 'motion/react';

const TOOLS = [
  { id: 1, name: 'WhatsAll Bot', url: 'ssocial.eu', day: 'Day 1', emoji: '🤖', time: '09:00 AM' },
  { id: 2, name: 'Claude Trading Agent', url: 'ssocial.eu', day: 'Day 2', emoji: '📈', time: '10:30 AM' },
  { id: 3, name: 'SocietyHUB CRM PRO', url: 'ssocietyhub.store', day: 'Day 3', emoji: '💼', time: '02:00 PM' },
  { id: 4, name: 'MrDelivery.AIStudio', url: 'ssocial.eu', day: 'Day 4', emoji: '🍔', time: '11:00 AM' },
  { id: 5, name: 'MrDelivery Agency', url: 'mrdelivery.ro', day: 'Day 5', emoji: '🏢', time: '04:30 PM' },
  { id: 6, name: 'MB EuroParts', url: 'mbeuroparts.lovable.app', day: 'Day 6', emoji: '⚙️', time: '01:15 PM' },
  { id: 7, name: 'Stealth Mode', url: 'ssocial.eu', day: 'Day 7', emoji: '🕵️', time: '08:00 PM' },
];

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const CalendarPage = () => {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-bold mb-2">7-Day Posting Calendar 📅</h1>
        <p className="text-white/40">Manage your automated marketing schedule across all platforms.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {WEEKDAYS.map((day, index) => {
          const tool = TOOLS[index];
          return (
            <motion.div
              key={day}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col space-y-4"
            >
              <div className="text-center py-2 border-b border-white/5">
                <p className="text-xs font-bold uppercase tracking-widest text-accent">{day}</p>
              </div>
              
              <div className="glass-card p-4 flex-1 min-h-[200px] relative group hover:border-accent transition-all">
                <div className="absolute top-2 right-2 text-xs text-white/20 font-mono">
                  {tool.time}
                </div>
                <div className="text-3xl mb-3">{tool.emoji}</div>
                <h4 className="font-bold text-sm mb-1">{tool.name}</h4>
                <p className="text-[10px] text-white/40 mb-4">{tool.url}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-[10px] text-white/60 bg-white/5 p-1 rounded">
                    <span>📱</span>
                    <span>TikTok / IG</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] text-white/60 bg-white/5 p-1 rounded">
                    <span>💼</span>
                    <span>LinkedIn</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] text-white/60 bg-white/5 p-1 rounded">
                    <span>📺</span>
                    <span>YouTube</span>
                  </div>
                </div>

                <button className="w-full mt-4 py-2 text-[10px] font-bold bg-accent/10 text-accent rounded hover:bg-accent hover:text-bg-dark transition-all">
                  VIEW ASSETS
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <section className="glass-card p-8">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <span>🤖</span>
          <span>Automation Status</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <p className="text-sm font-medium text-white/60">Next Scheduled Post</p>
            <p className="text-2xl font-bold text-accent">WhatsAll Bot</p>
            <p className="text-xs text-white/40">Tomorrow at 09:00 AM</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-white/60">Active Platforms</p>
            <div className="flex gap-2 text-xl">
              <span>📱</span>
              <span>📸</span>
              <span>👥</span>
              <span>💼</span>
              <span>📺</span>
              <span>𝕏</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-white/60">Botato Connection</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <p className="text-sm font-bold text-success">Connected & Ready</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
