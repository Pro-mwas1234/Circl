'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Flame, Users, Sparkles } from 'lucide-react';

interface CircleInfo {
  name: string;
  workType: string;
  isStanding: boolean;
  organizer?: { username: string };
  _count?: { members: number };
}

export default function InvitePage() {
  const params = useParams();
  const code = params.code as string;
  const router = useRouter();

  const [circle, setCircle] = useState<CircleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const fetchInviteDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/invite/${code}`);
      const data = await res.json();
      if (res.ok) {
        setCircle(data.circle);
      } else {
        setError(data.error || 'Invalid invite code');
      }
    } catch {
      setError('Failed to fetch invite details');
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchInviteDetails();
  }, [fetchInviteDetails]);

  async function handleAcceptInvite() {
    setJoining(true);
    try {
      const res = await fetch(`/api/invite/${code}`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          alert('Please sign in or register first to join this circle.');
          router.push('/');
          return;
        }
        setError(data.error || 'Could not join circle');
        return;
      }

      const sessionRes = await fetch(`/api/circles/${data.circleId}/session`, {
        method: 'POST',
      });
      const sessionData = await sessionRes.json();

      if (sessionRes.ok) {
        router.push(`/room/${sessionData.session.id}`);
      } else {
        router.push('/');
      }
    } catch {
      setError('Failed to join circle via invite');
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400">Loading invite...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-8 shadow-2xl text-center">
        {error || !circle ? (
          <div>
            <h2 className="text-xl font-bold text-rose-400 mb-2">Invite Error</h2>
            <p className="text-sm text-slate-400 mb-6">{error || 'Invalid circle'}</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm"
            >
              Go to Home
            </button>
          </div>
        ) : (
          <div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-xl mx-auto mb-4 shadow-lg shadow-indigo-500/30">
              O
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">You&apos;re Invited!</h1>
            <p className="text-sm text-slate-400 mb-6">
              Join <span className="text-indigo-300 font-semibold">{circle.name}</span> created by @
              {circle.organizer?.username}.
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-left mb-6">
              <div className="flex items-center text-xs text-slate-300 space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>
                  Work Type: <strong className="text-white">{circle.workType}</strong>
                </span>
              </div>
              <div className="flex items-center text-xs text-slate-300 space-x-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span>
                  Members: <strong className="text-white">{circle._count?.members || 1} / 6</strong>
                </span>
              </div>
              {circle.isStanding && (
                <div className="flex items-center text-xs text-amber-400 space-x-2">
                  <Flame className="w-4 h-4 fill-amber-400" />
                  <span>Standing Circle • Weekly Slot</span>
                </div>
              )}
            </div>

            <button
              onClick={handleAcceptInvite}
              disabled={joining}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/30"
            >
              {joining ? 'Joining Circle...' : 'Accept Invite & Join Room'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
