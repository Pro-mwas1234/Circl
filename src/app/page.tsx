'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Flame, Clock, Sparkles, Plus, LogIn, LogOut } from 'lucide-react';

interface CircleMember {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
  };
}

interface CircleData {
  id: string;
  name: string;
  description?: string;
  workType: string;
  durationMins: number;
  isStanding: boolean;
  timeSlot?: string;
  inviteCode: string;
  streak: number;
  organizer: {
    id: string;
    username: string;
    email: string;
  };
  members: CircleMember[];
}

interface UserData {
  id: string;
  username: string;
  email: string;
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [circles, setCircles] = useState<CircleData[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'standing' | 'dropin'>('all');

  // Auth Form Modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Create Circle Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [workType, setWorkType] = useState('Deep Work');
  const [durationMins, setDurationMins] = useState('50');
  const [isStanding, setIsStanding] = useState(false);
  const [timeSlot, setTimeSlot] = useState('Mondays 09:00 AM');
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    checkUser();
    fetchCircles();
  }, []);

  async function checkUser() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setUser(data.user);
    } catch {
      // ignore
    }
  }

  async function fetchCircles() {
    try {
      const res = await fetch('/api/circles');
      const data = await res.json();
      if (data.circles) {
        setCircles(data.circles);
      }
    } catch {
      // ignore
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed');
        return;
      }
      setUser(data.user);
      setShowAuthModal(false);
      setEmail('');
      setUsername('');
      setPassword('');
    } catch {
      setAuthError('An error occurred');
    }
  }

  async function handleGoogleAuth() {
    try {
      const mockGoogleUsername = `google_user_${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `${mockGoogleUsername}@gmail.com`,
          username: mockGoogleUsername,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setShowAuthModal(false);
      }
    } catch {
      setAuthError('Google login failed');
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/me', { method: 'POST' });
    setUser(null);
  }

  async function handleCreateCircle(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    try {
      const res = await fetch('/api/circles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          workType,
          durationMins: parseInt(durationMins, 10),
          isStanding,
          timeSlot: isStanding ? timeSlot : 'Drop-in',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCreateError(data.error || 'Failed to create circle');
        return;
      }

      setShowCreateModal(false);
      setName('');
      fetchCircles();
    } catch {
      setCreateError('Error creating circle');
    }
  }

  async function handleJoinCircleSession(circleId: string) {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    try {
      const res = await fetch(`/api/circles/${circleId}/session`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Could not join session');
        return;
      }
      router.push(`/room/${data.session.id}`);
    } catch {
      alert('Failed to join session room');
    }
  }

  const filteredCircles = circles.filter((c) => {
    if (activeTab === 'standing') return c.isStanding;
    if (activeTab === 'dropin') return !c.isStanding;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Header / Nav */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
              O
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white">Tiny Focus Circles</span>
              <span className="text-xs text-indigo-400 block -mt-1 font-medium">Standing Accountability Rooms</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-slate-300">
                  <span className="text-slate-500 mr-1">Hi,</span>
                  <span className="text-indigo-300 font-semibold">{user.username}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold shadow-md shadow-indigo-600/20 transition flex items-center space-x-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In / Register</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-12 text-center">
        <div className="inline-flex items-center space-x-2 bg-indigo-950/60 border border-indigo-800/50 px-3 py-1.5 rounded-full text-indigo-300 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Not a solo timer. A social commitment layer.</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
          Tiny Recurring Focus Circles
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-base md:text-lg mb-8 leading-relaxed">
          4–6 people. Same recurring time slot. Same shared goal. Standing micro-communities that make sure you show up and complete your work.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={() => {
              if (!user) {
                setShowAuthModal(true);
              } else {
                setShowCreateModal(true);
              }
            }}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Create Standing Circle</span>
          </button>
        </div>
      </section>

      {/* Circle Filters & Listing */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-8">
          <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Circles
            </button>
            <button
              onClick={() => setActiveTab('standing')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition flex items-center space-x-1.5 ${
                activeTab === 'standing'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Standing Circles (The Moat)</span>
            </button>
            <button
              onClick={() => setActiveTab('dropin')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'dropin'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Drop-In Rooms
            </button>
          </div>

          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Max 6 members per micro-circle
          </span>
        </div>

        {filteredCircles.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800/60">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-slate-300 font-semibold text-lg">No circles found</h3>
            <p className="text-slate-500 text-sm mt-1">Be the first organizer to seed a standing circle!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCircles.map((circle) => (
              <div
                key={circle.id}
                className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 transition flex flex-col justify-between shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                        circle.isStanding
                          ? 'bg-amber-950/50 text-amber-300 border-amber-800/50'
                          : 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50'
                      }`}
                    >
                      {circle.isStanding ? 'Standing Circle' : 'Drop-in Room'}
                    </span>

                    {circle.isStanding && (
                      <div className="flex items-center space-x-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md text-xs font-bold">
                        <Flame className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{circle.streak} wk streak</span>
                      </div>
                    )}
                  </div>

                  <h2 className="text-xl font-bold text-white mb-2">{circle.name}</h2>
                  <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                    {circle.description || 'Focused co-working session to get real work done together.'}
                  </p>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center text-xs text-slate-300 space-x-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>
                        {circle.durationMins} mins • {circle.timeSlot || 'Drop-in'}
                      </span>
                    </div>

                    <div className="flex items-center text-xs text-slate-300 space-x-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span className="font-semibold text-indigo-300">{circle.workType}</span>
                    </div>

                    <div className="flex items-center text-xs text-slate-400 space-x-2">
                      <Users className="w-4 h-4 text-slate-500" />
                      <span>
                        {circle.members?.length || 1} / 6 members • Organizer: @
                        {circle.organizer?.username}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                  <button
                    onClick={() => handleJoinCircleSession(circle.id)}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2"
                  >
                    <span>Enter Focus Room</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h2 className="text-xl font-bold text-white mb-1">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Join standing focus circles and maintain collective streaks.
            </p>

            {authError && (
              <div className="bg-rose-950/60 border border-rose-800 text-rose-300 p-3 rounded-lg text-xs mb-4">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="alex@gmail.com"
                />
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    placeholder="alex_builder"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-indigo-600/20"
              >
                {isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="my-4 flex items-center text-slate-600">
              <div className="flex-1 border-b border-slate-800"></div>
              <span className="px-3 text-xs text-slate-500">OR</span>
              <div className="flex-1 border-b border-slate-800"></div>
            </div>

            <button
              onClick={handleGoogleAuth}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-xl text-sm transition flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.6-.7-.9-1.5-.9-2.3z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="mt-4 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs text-indigo-400 hover:underline"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </button>
            </div>

            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Create Circle Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <h2 className="text-xl font-bold text-white mb-1">Create Focus Circle</h2>
            <p className="text-xs text-slate-400 mb-6">
              Set up a 4–6 person circle for synchronized deep work.
            </p>

            {createError && (
              <div className="bg-rose-950/60 border border-rose-800 text-rose-300 p-3 rounded-lg text-xs mb-4">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateCircle} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Circle Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Early Birds Deep Work"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Work Type</label>
                  <select
                    value={workType}
                    onChange={(e) => setWorkType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Deep Work">Deep Work</option>
                    <option value="Study">Study</option>
                    <option value="Admin">Admin</option>
                    <option value="Creative">Creative</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Duration</label>
                  <select
                    value={durationMins}
                    onChange={(e) => setDurationMins(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="25">25 Mins (Pomodoro)</option>
                    <option value="50">50 Mins (Standard)</option>
                    <option value="90">90 Mins (Deep Sprint)</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-white block">Standing Circle (Recurring)</span>
                    <span className="text-xs text-slate-400">
                      Unlocks collective weekly streaks & standing accountability.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isStanding}
                    onChange={(e) => setIsStanding(e.target.checked)}
                    className="w-5 h-5 accent-indigo-600 rounded"
                  />
                </div>

                {isStanding && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Weekly Time Slot</label>
                    <input
                      type="text"
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      placeholder="e.g. Mon & Wed 09:00 AM"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-indigo-600/20"
              >
                Create Circle
              </button>
            </form>

            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
