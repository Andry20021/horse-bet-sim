'use client';

import Header from './components/Header';
import LiveChat from './components/LiveChat';
import HorseStats from './components/HorseStats';
import RaceUI from './components/RaceUI';
import { useEffect, useState } from 'react';

export default function Home() {
  const STARTING_BALANCE = 10000;
  const DEFAULT_USERNAME = 'Guest';

  const [balance, setBalance] = useState(STARTING_BALANCE);
  const [username] = useState(DEFAULT_USERNAME);
  const [user] = useState({ name: DEFAULT_USERNAME }); // fake user object so old props still work
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

  // 🎲 Generate random stats for each horse
  const generateRandomStats = (horses: Horse[]) => {
    const stats = Object.fromEntries(
      horses.map(horse => [
        horse.name,
        {
          totalWins: Math.floor(Math.random() * 10),
          totalLosses: Math.floor(Math.random() * 10),
          totalPayout: Math.floor(Math.random() * 5000),
        },
      ])
    );
    setHorseStats(stats);
  };

  useEffect(() => {
    if (horses.length > 0) {
      generateRandomStats(horses);
    }
  }, [horses]);

  return (
    <main className="min-h-screen bg-[#0F0F0F] text-white font-sans">
      {/* Header gets username and balance */}
      <Header
        username={username}
        balance={balance}
        setBalance={setBalance}
        setUsername={() => {}}
      />

      <section className="relative flex flex-wrap xl:flex-nowrap justify-center items-start py-16 px-4 gap-4">
        <HorseStats horses={horses} horseStats={horseStats} />

        <RaceUI
          balance={balance}
          setBalance={setBalance}
          onHorsesReady={setHorses}
          onStatsReady={setHorseStats}
        />

        {/* LiveChat gets username for message display */}
        <LiveChat username={username} />
      </section>
    </main>
  );
}
