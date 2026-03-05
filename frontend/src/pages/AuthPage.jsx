import { useState } from 'react';
import { useAuth } from '../AuthContext';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin
        ? { username, password }
        : { username, email, password };

      const response = await fetch(`http://127.0.0.1:5000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Login successful
      login(data.token, data.user);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 px-4 relative overflow-hidden">
      {/* Background Decorative Shapes */}
      <div className="absolute inset-0 pointer-events-none">
        <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Wavy lines */}
          <path
            d="M0,200 Q300,150 600,200 T1200,200"
            stroke="rgba(255, 255, 255, 0.5)"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M-100,400 Q200,350 500,400 T900,400"
            stroke="rgba(255, 255, 255, 0.45)"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M100,600 Q400,550 700,600 T1300,600"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="2"
            fill="none"
          />
          
          {/* Circles */}
          <circle
            cx="85%"
            cy="20%"
            r="150"
            stroke="rgba(255, 255, 255, 0.48)"
            strokeWidth="2"
            fill="none"
          />
          <circle
            cx="15%"
            cy="75%"
            r="100"
            stroke="rgba(255, 255, 255, 0.45)"
            strokeWidth="2"
            fill="none"
          />
          <circle
            cx="95%"
            cy="90%"
            r="60"
            stroke="rgba(255, 255, 255, 0.42)"
            strokeWidth="1"
            fill="none"
          />
          
          {/* Diagonal lines */}
          <line
            x1="0"
            y1="0"
            x2="150"
            y2="150"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="1"
          />
          <line
            x1="100%"
            y1="0"
            x2="85%"
            y2="15%"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="1"
          />
        </svg>
      </div>

      <div className="bg-white dark:bg-gray-50 rounded-2xl p-8 w-full max-w-md relative z-10" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 15px 30px -8px rgba(0, 0, 0, 0.3)' }}>
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg">
            <span className="text-4xl">🎓</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="text-center text-gray-600 mb-6 text-sm">
          {isLogin ? 'Sign in to access your conversations' : 'Join EduMentor AI today'}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-900"
              placeholder="Enter your username"
              disabled={loading}
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-900"
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-900"
              placeholder={isLogin ? 'Enter your password' : 'Create a password (min 6 characters)'}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isLogin ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              <>{isLogin ? 'Sign In' : 'Create Account'}</>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            disabled={loading}
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
