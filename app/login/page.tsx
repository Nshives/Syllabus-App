'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState(''); // Added simple error state for better feedback
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push('/dashboard');
      } else {
        const data = await res.json();
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // 1. Background: Dark gradient to ensure contrast (looks good on its own or over an image)
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
      
      {/* 2. Container: Glassmorphism effect (Blur + Semi-transparent dark bg) */}
      <div className="w-full max-w-md p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-gray-400 text-sm">
            {isRegistering ? 'Enter your details to get started' : 'Enter your details to sign in'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Error Message Banner */}
          {error && (
            <div className="p-3 rounded bg-red-500/10 border border-red-500/50 text-red-200 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5 ml-1">
              Email Address
            </label>
            <input
              className="w-full p-3 rounded-lg bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="name@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5 ml-1">
              Password
            </label>
            <input
              className="w-full p-3 rounded-lg bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            disabled={isLoading}
            className="w-full py-3.5 mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : (isRegistering ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}
            <button 
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="ml-2 text-blue-400 hover:text-blue-300 font-semibold hover:underline transition-colors"
            >
              {isRegistering ? 'Log in' : 'Register'}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}