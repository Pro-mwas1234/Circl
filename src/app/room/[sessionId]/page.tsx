'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import io, { Socket } from 'socket.io-client';
import {
  Flame,
  Clock,
  Users,
  Video,
  VideoOff,
  Send,
  CheckCircle2,
  Share2,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';

interface UserInfo {
  id: string;
  username: string;
  avatar?: string;
}

interface Participant {
  userId: string;
  user: UserInfo;
  goal?: string;
  cameraOn: boolean;
  status: 'pending' | 'done' | 'partial' | 'blocked';
}

interface ChatMsg {
  id?: string;
  userId: string;
  username: string;
  text: string;
  createdAt?: string;
}

interface SessionData {
  id: string;
  endTime: string;
  circle: {
    id: string;
    name: string;
    workType: string;
    isStanding: boolean;
    streak: number;
    timeSlot?: string;
    inviteCode: string;
  };
  participants: Participant[];
  chatMessages: ChatMsg[];
}

export default function FocusRoomPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const router = useRouter();

  const [session, setSession] = useState<SessionData | null>(null);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Focus room state
  const [goal, setGoal] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [status, setStatus] = useState<'pending' | 'done' | 'partial' | 'blocked'>('pending');

  // Shared Synchronized Timer state (in seconds)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(50 * 60);

  // Chat state
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');

  // UI state
  const [copiedLink, setCopiedLink] = useState(false);
  const [converting, setConverting] = useState(false);

  // WebSockets ref
  const socketRef = useRef<Socket | null>(null);

  const setupSocket = useCallback((roomSessionId: string, user: UserInfo) => {
    const socket = io();
    socketRef.current = socket;

    socket.emit('join-room', { sessionId: roomSessionId, user });

    socket.on('user-joined', ({ user: joinedUser }: { user: UserInfo }) => {
      setSession((prevSession) => {
        if (!prevSession) return prevSession;
        const exists = prevSession.participants.some((p) => p.userId === joinedUser.id);
        if (exists) return prevSession;
        return {
          ...prevSession,
          participants: [
            ...prevSession.participants,
            {
              userId: joinedUser.id,
              user: joinedUser,
              goal: '',
              cameraOn: false,
              status: 'pending',
            },
          ],
        };
      });
    });

    socket.on('goal-updated', ({ userId, goal: newGoal }: { userId: string; goal: string }) => {
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map((p) =>
            p.userId === userId ? { ...p, goal: newGoal } : p
          ),
        };
      });
    });

    socket.on('camera-toggled', ({ userId, cameraOn: camOn }: { userId: string; cameraOn: boolean }) => {
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map((p) =>
            p.userId === userId ? { ...p, cameraOn: camOn } : p
          ),
        };
      });
    });

    socket.on('status-updated', ({ userId, status: newStatus }: { userId: string; status: 'pending' | 'done' | 'partial' | 'blocked' }) => {
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map((p) =>
            p.userId === userId ? { ...p, status: newStatus } : p
          ),
        };
      });
    });

    socket.on('chat-message', (msg: ChatMsg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('timer-synced', ({ remainingSeconds: remSecs }: { remainingSeconds: number }) => {
      setRemainingSeconds(remSecs);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchSessionAndUser = useCallback(async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (!meData.user) {
        router.push('/');
        return;
      }
      setCurrentUser(meData.user);

      const sessionRes = await fetch(`/api/sessions/${sessionId}`);
      const sessionData = await sessionRes.json();

      if (!sessionRes.ok || !sessionData.session) {
        alert('Session not found');
        router.push('/');
        return;
      }

      const s = sessionData.session as SessionData;
      setSession(s);

      const endTimeMs = new Date(s.endTime).getTime();
      const nowMs = Date.now();
      const diffSecs = Math.max(0, Math.floor((endTimeMs - nowMs) / 1000));
      setRemainingSeconds(diffSecs);

      const p = s.participants.find((part) => part.userId === meData.user.id);
      if (p) {
        setGoal(p.goal || '');
        setCameraOn(p.cameraOn || false);
        setStatus(p.status || 'pending');
      }

      if (s.chatMessages) {
        setMessages(s.chatMessages);
      }

      setupSocket(sessionId, meData.user);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [sessionId, router, setupSocket]);

  useEffect(() => {
    fetchSessionAndUser();
  }, [fetchSessionAndUser]);

  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingSeconds]);

  async function handleGoalBlur() {
    if (!currentUser) return;
    try {
      await fetch(`/api/sessions/${sessionId}/participant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal }),
      });
      socketRef.current?.emit('goal-update', {
        sessionId,
        userId: currentUser.id,
        goal,
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function toggleCamera() {
    if (!currentUser) return;
    const newCameraState = !cameraOn;
    setCameraOn(newCameraState);

    try {
      await fetch(`/api/sessions/${sessionId}/participant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cameraOn: newCameraState }),
      });
      socketRef.current?.emit('camera-toggle', {
        sessionId,
        userId: currentUser.id,
        cameraOn: newCameraState,
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function handleStatusChange(newStatus: 'done' | 'partial' | 'blocked') {
    if (!currentUser) return;
    setStatus(newStatus);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/participant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      socketRef.current?.emit('status-update', {
        sessionId,
        userId: currentUser.id,
        status: newStatus,
      });

      if (data.streakUpdated) {
        setSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            circle: { ...prev.circle, streak: data.newStreak },
          };
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || !currentUser) return;

    const msg = chatInput.trim();
    setChatInput('');

    socketRef.current?.emit('send-message', {
      sessionId,
      user: currentUser,
      message: msg,
    });
  }

  async function handleConvertToStandingCircle() {
    if (!session?.circle) return;
    setConverting(true);
    try {
      const res = await fetch(`/api/circles/${session.circle.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert', timeSlot: 'Weekly Standing Slot' }),
      });
      if (res.ok) {
        setSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            circle: { ...prev.circle, isStanding: true, timeSlot: 'Weekly Standing Slot' },
          };
        });
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to convert to standing circle');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setConverting(false);
    }
  }

  function copyInviteLink() {
    if (!session?.circle?.inviteCode) return;
    const inviteUrl = `${window.location.origin}/invite/${session.circle.inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex items-center space-x-3 text-indigo-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="font-semibold text-lg">Entering Focus Circle...</span>
        </div>
      </div>
    );
  }

  const { circle, participants } = session;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Top Header Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/')}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-lg text-white">{circle.name}</h1>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                  circle.isStanding
                    ? 'bg-amber-950/50 text-amber-300 border-amber-800/50'
                    : 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50'
                }`}
              >
                {circle.isStanding ? 'Standing Circle' : 'Drop-in'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Work Type: <span className="text-indigo-300 font-medium">{circle.workType}</span>
            </p>
          </div>
        </div>

        {/* Collective Streak Banner & Growth Link */}
        <div className="flex items-center space-x-4">
          {circle.isStanding ? (
            <div className="flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-xl text-sm font-bold shadow-sm">
              <Flame className="w-4 h-4 fill-amber-400" />
              <span>{circle.streak} Week Collective Streak</span>
            </div>
          ) : (
            <button
              onClick={handleConvertToStandingCircle}
              disabled={converting}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-amber-600/20 flex items-center space-x-1.5"
            >
              <Flame className="w-4 h-4" />
              <span>Make this a Standing Circle</span>
            </button>
          )}

          <button
            onClick={copyInviteLink}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5"
          >
            {copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span>{copiedLink ? 'Copied Invite Link!' : 'Invite (Growth Link)'}</span>
          </button>
        </div>
      </header>

      {/* Main Focus Room Grid Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* Left / Center Area: Shared Synchronized Timer & Participant Grid */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          {/* Synchronized Shared Timer Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center relative overflow-hidden shadow-xl">
            <div className="absolute top-4 right-4 flex items-center space-x-2 text-xs text-slate-400 bg-slate-950/60 px-2.5 py-1 rounded-full border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Synchronized Timer</span>
            </div>

            <div className="text-6xl md:text-7xl font-mono font-extrabold tracking-tight text-white my-4">
              {formatTime(remainingSeconds)}
            </div>

            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Synchronized focus session. Work quietly together until the break.
            </p>
          </div>

          {/* Participant Grid (Symmetric Visibility - 4 to 6 people) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h2 className="font-bold text-white text-base">
                  Circle Members ({participants.length}/6)
                </h2>
              </div>
              <span className="text-xs text-slate-500">Symmetric Visibility</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              {participants.map((p) => {
                const isMe = p.userId === currentUser?.id;
                return (
                  <div
                    key={p.userId}
                    className={`bg-slate-950 border rounded-xl p-4 flex flex-col justify-between transition ${
                      isMe ? 'border-indigo-500/60 bg-indigo-950/10' : 'border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-indigo-300 text-xs border border-slate-700">
                            {p.user?.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-white block leading-none">
                              {p.user?.username} {isMe && '(You)'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {p.cameraOn ? 'Camera Active' : 'Camera Off'}
                            </span>
                          </div>
                        </div>

                        {/* Camera Indicator Toggle */}
                        {isMe ? (
                          <button
                            onClick={toggleCamera}
                            className={`p-2 rounded-lg border text-xs font-semibold transition flex items-center space-x-1 ${
                              cameraOn
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                            }`}
                            title="Toggle Camera Indicator"
                          >
                            {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                          </button>
                        ) : (
                          <div
                            className={`p-1.5 rounded-lg border ${
                              p.cameraOn
                                ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/50'
                                : 'bg-slate-900 text-slate-600 border-slate-800'
                            }`}
                          >
                            {p.cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                          </div>
                        )}
                      </div>

                      {/* One-Line Goal Declaration */}
                      <div className="mb-3">
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          One-Line Goal:
                        </label>
                        {isMe ? (
                          <input
                            type="text"
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            onBlur={handleGoalBlur}
                            placeholder="What I'm finishing this session..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                          />
                        ) : (
                          <p className="text-xs text-slate-200 bg-slate-900 border border-slate-800/80 rounded-lg px-3 py-1.5 italic min-h-[30px] flex items-center">
                            {p.goal || 'No goal declared yet'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Close Out Status Check-In */}
                    <div className="pt-2 border-t border-slate-800/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-400">Close Out:</span>

                        {isMe ? (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleStatusChange('done')}
                              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                                status === 'done'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-800 text-slate-400 hover:text-emerald-400'
                              }`}
                            >
                              Done
                            </button>
                            <button
                              onClick={() => handleStatusChange('partial')}
                              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                                status === 'partial'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-slate-800 text-slate-400 hover:text-amber-400'
                              }`}
                            >
                              Partial
                            </button>
                            <button
                              onClick={() => handleStatusChange('blocked')}
                              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                                status === 'blocked'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-800 text-slate-400 hover:text-rose-400'
                              }`}
                            >
                              Blocked
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                              p.status === 'done'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : p.status === 'partial'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : p.status === 'blocked'
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : 'text-slate-500'
                            }`}
                          >
                            {p.status || 'pending'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Area: Real-Time WebSockets Text Chat */}
        <div className="lg:col-span-4 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl p-4 h-[600px] lg:h-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <h3 className="font-bold text-white text-sm">Circle Text Chat</h3>
            <span className="text-[10px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Optional
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {messages.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                No messages yet. Send encouragement or state break updates!
              </p>
            ) : (
              messages.map((m, idx) => {
                const isMeMsg = m.userId === currentUser?.id;
                return (
                  <div
                    key={m.id || idx}
                    className={`flex flex-col ${isMeMsg ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-slate-500 mb-0.5">
                      {m.username || 'Member'}
                    </span>
                    <div
                      className={`px-3 py-2 rounded-xl text-xs max-w-[85%] ${
                        isMeMsg
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSendMessage} className="mt-3 pt-3 border-t border-slate-800 flex items-center space-x-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Send message..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
