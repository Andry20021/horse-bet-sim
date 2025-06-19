'use client';

import Header from './components/Header';
import LiveChat from './components/LiveChat';
import HorseStats from './components/HorseStats';
import Login from './components/Login';
import RaceUI from './components/RaceUI';

import { useEffect, useState, useCallback } from 'react';
import { auth, db } from './lib/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';

export default function Home() {
  const [username, setUsername] = useState('');
  const [balance, setBalance] = useState(10000);
  const [user, setUser] = useState<User | null>(null);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [horseStats, setHorseStats] = useState<Record<string, HorseStats>>({});

  type Horse = {
    id: number;
    name: string;
    odds: number;
    speed: number;
    icon: string;
  };

  type HorseStats = {
    totalWins: number;
    totalLosses: number;
    totalPayout: number;
  };



  const loadStats = useCallback(async () => {
    const entries = await Promise.all(
      horses.map(async (horse) => {
        try {
          const ref = doc(db, 'horses', horse.name);
          const snap = await getDoc(ref);
          return [horse.name, snap.exists() ? snap.data() : { totalWins: 0, totalLosses: 0, totalPayout: 0 }];
        } catch {
          return [horse.name, { totalWins: 0, totalLosses: 0, totalPayout: 0 }];
        }
      })
    );
    setHorseStats(Object.fromEntries(entries));
  }, [horses]);



  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.balance !== undefined) setBalance(data.balance);
          if (data.username) setUsername(data.username);
        }
      }
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (horses.length === 0) return;
    loadStats();
  }, [horses, loadStats]);



  return (
    <>

      <Header
        user={user}
        username={username}
        balance={balance}
        setBalance={setBalance}
        setUsername={setUsername}
      />

      {!user && <Login />}

      {user && (
        <main className="min-h-screen bg-[#0F0F0F] text-white font-sans">
          <section className="relative flex flex-wrap xl:flex-nowrap justify-center items-start py-16 px-4 gap-4">

            <HorseStats horses={horses} horseStats={horseStats} />

            <RaceUI
              balance={balance}
              setBalance={setBalance}
              onHorsesReady={setHorses}
              onStatsReady={setHorseStats}
            />

            <LiveChat username={username} />

          </section>
        </main>
      )}

    </>
  );
}
