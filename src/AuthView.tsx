import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth } from './firebase';
import { motion } from 'motion/react';
import { Leaf } from 'lucide-react';

export function AuthView() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password sign-in is not enabled in your Firebase console. Please enable it in the Authentication > Sign-in method tab.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
        setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcf8f2] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.05)_100%)] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border-2 border-[#d8b792] p-8 rounded-2xl shadow-xl relative z-10"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-[#8c5737] rounded-full flex items-center justify-center mb-4 shadow-sm border-2 border-[#61361c]">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-script text-4xl text-[#4d2b18]">Little Corner</h1>
          <p className="font-sans text-sm text-[#4d2b18]/60 mt-1">
            {isLogin ? 'Welcome back to your space' : 'Create your cozy corner'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block font-sans text-sm font-bold text-[#4d2b18] mb-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#fdfaf3] border-2 border-[#d8b792] rounded-lg px-4 py-2 font-sans focus:outline-none focus:border-[#4d2b18] transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block font-sans text-sm font-bold text-[#4d2b18] mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#fdfaf3] border-2 border-[#d8b792] rounded-lg px-4 py-2 font-sans focus:outline-none focus:border-[#4d2b18] transition-colors"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#8c5737] text-white font-bold font-sans py-3 rounded-lg mt-2 hover:bg-[#61361c] transition-colors disabled:opacity-50"
          >
            {loading ? '...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-4 relative flex items-center">
            <div className="flex-grow border-t border-[#d8b792]"></div>
            <span className="flex-shrink-0 mx-4 text-[#4d2b18]/60 text-sm">or</span>
            <div className="flex-grow border-t border-[#d8b792]"></div>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-white text-[#4d2b18] border-2 border-[#d8b792] font-bold font-sans py-3 rounded-lg mt-4 hover:bg-[#fcf8f2] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="font-sans text-sm text-[#8c5737] hover:underline"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
