import React from 'react';
import { useAuthStore } from '../store/authStore';
import { motion } from 'motion/react';

export const LoginPage = () => {
  const { login, loading, error } = useAuthStore();

  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-success/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full glass-card p-10 relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center text-bg-dark font-bold text-3xl mx-auto mb-6 electric-glow">
            S
          </div>
          <h1 className="text-3xl font-bold mb-2">S Society Hub</h1>
          <p className="text-white/60">AI Content Factory PRO</p>
        </div>

        <div className="space-y-6 mb-10">
          <div className="flex items-start space-x-4">
            <div className="mt-1 p-2 bg-white/5 rounded-lg text-2xl">
              ✨
            </div>
            <div>
              <h3 className="font-medium">AI Intelligence</h3>
              <p className="text-sm text-white/40">Powered by Gemini 3.1 Pro for elite content.</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="mt-1 p-2 bg-white/5 rounded-lg text-2xl">
              ⚡
            </div>
            <div>
              <h3 className="font-medium">Auto-Posting</h3>
              <p className="text-sm text-white/40">Direct integration with Botato automation.</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="mt-1 p-2 bg-white/5 rounded-lg text-2xl">
              🛡️
            </div>
            <div>
              <h3 className="font-medium">Enterprise Ready</h3>
              <p className="text-sm text-white/40">Secure, scalable, and professional workflows.</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-alert/10 border border-alert/20 rounded-xl text-alert text-sm">
            {error}
          </div>
        )}

        <button
          onClick={login}
          disabled={loading}
          className="w-full py-4 bg-white text-bg-dark font-bold rounded-xl flex items-center justify-center space-x-3 hover:bg-accent transition-all duration-300 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-bg-dark border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span className="text-xl">🔑</span>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <p className="mt-8 text-center text-xs text-white/30">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
};
