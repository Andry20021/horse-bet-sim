'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { GrMoney } from 'react-icons/gr';
import { GiHorseHead } from 'react-icons/gi';

interface Horse {
  id: number;
  name: string;
  odds: number;
  speed: number;
  icon: string;
}

interface HorseStats {
  totalWins: number;
  totalLosses: number;
  totalPayout: number;
}

interface RaceUIProps {
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  onHorsesReady: (horses: Horse[]) => void;
  onStatsReady: (stats: Record<string, HorseStats>) => void;
}

const RaceUI: React.FC<RaceUIProps> = ({ balance, setBalance, onHorsesReady, onStatsReady }) => {
  const [horseCount, setHorseCount] = useState(3);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [positions, setPositions] = useState<number[]>([]);
  const [raceOn, setRaceOn] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState<number>(0);
  const [selectedHorseId, setSelectedHorseId] = useState<number | null>(null);
  const raceEndedRef = useRef(false);

  const payoutMultiplier = {
    3: 1.0,
    4: 1.2,
    5: 1.5,
    6: 2.0,
  }[horseCount] ?? 1.0;

  const ALL_HORSE_NAMES = [
    'Thunderbolt', 'Midnight Dash', 'Lightning Strike', 'Storm Chaser', 'Rapid Flame',
    'Dust Runner', 'Shadow Sprint', 'Iron Hoof', 'Golden Gallop', 'Steel Comet',
    'Crimson Charger', 'Silver Mane', 'Blazing Star', 'Frost Wind', 'Solar Flash',
    'Dark Comet', 'Electric Whisper', 'Vortex Vixen', 'Blitz Phantom', 'Nova Runner'
  ];

  const nameToIcon = (name: string) => `/images/${name.toLowerCase().replace(/ /g, '-')}.png`;

  const generateHorses = (count: number): Horse[] => {
    const shuffled = [...ALL_HORSE_NAMES].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).map((name, i) => {
      const odds = parseFloat((Math.random() * 2 + 1.5).toFixed(2));
      const speed = 4.5 - odds;
      return {
        id: i + 1,
        name,
        odds,
        speed,
        icon: nameToIcon(name),
      };
    });
  };

  useEffect(() => {
    const fresh = generateHorses(horseCount);
    setHorses(fresh);
    setPositions(new Array(horseCount).fill(0));
    onHorsesReady(fresh);
  }, [horseCount, onHorsesReady]);

  const handleStartRace = () => {
    if (!selectedHorseId || betAmount <= 0 || betAmount > balance) return;

    setBalance((prev) => prev - betAmount);
    setRaceOn(true);
    setWinner(null);
    setPositions(new Array(horseCount).fill(0));
    raceEndedRef.current = false;
  };

  useEffect(() => {
    if (!raceOn) return;

    const interval = setInterval(() => {
      setPositions((prev) => {
        const newPos = prev.map((p, i) => Math.min(p + Math.random() * horses[i].speed, 100));
        const winIdx = newPos.findIndex((p) => p >= 100);
        if (winIdx !== -1) {
          clearInterval(interval);
          const winHorse = horses[winIdx];
          setWinner(winHorse.name);
          setRaceOn(false);

          if (!raceEndedRef.current) {
            const selectedHorse = horses.find((h) => h.id === selectedHorseId);
            if (selectedHorse) {
              const won = selectedHorse.name === winHorse.name;
              const payout = won ? betAmount * selectedHorse.odds * payoutMultiplier : 0;
              if (won) setBalance((prev) => prev + payout);
            }
            raceEndedRef.current = true;
          }
        }
        return newPos;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [raceOn, horses, selectedHorseId, betAmount, payoutMultiplier, setBalance]);

  return (
    <div className="w-full xl:w-3/5 bg-[#1E1E1E] rounded-xl shadow-lg border border-gray-700 p-4 md:p-5 z-10">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
            <GiHorseHead className="w-12 h-12 sm:w-16 sm:h-12 object-contain rounded" />
            <h2 className="text-lg sm:text-xl font-semibold text-center">Horse Racing Simulator</h2>
            <div className="flex items-center text-sm bg-[#333] px-4 py-2 rounded shadow border border-gray-600 space-x-2">
                <GrMoney className="text-yellow-300" />
                <span>Balance: ${balance.toFixed(2)}</span>
            </div>
        </div>

        <div className="relative w-full rounded-lg overflow-hidden bg-black px-2 sm:px-4 pt-2 pb-4">
            <div className="relative w-full h-[400px] sm:h-[500px] md:h-[550px] rounded-lg overflow-hidden px-2 sm:px-4 pt-4 pb-8">
                {!raceOn && !winner && (
                    <div className="absolute inset-0 flex flex-col justify-center items-center bg-black bg-opacity-60 rounded-lg px-2">
                        <div className="bg-[#1E1E1E] p-4 rounded-lg border border-gray-600 w-full max-w-md z-50 relative">
                            <h3 className="text-lg sm:text-xl font-semibold mb-4 text-center">Place Your Bet</h3>

                            <label className="block mb-1 text-sm">Number of Horses:</label>
                            <select
                                value={horseCount}
                                onChange={(e) => setHorseCount(parseInt(e.target.value))}
                                className="w-full px-3 py-2 bg-[#333] border border-gray-600 rounded text-white mb-4"
                            >
                                {[3, 4, 5, 6].map((count) => (
                                    <option key={count} value={count}>{count} Horses</option>
                                ))}
                            </select>

                            <div className="space-y-3 mb-4 max-h-32 overflow-y-auto pr-1 sm:max-h-none sm:overflow-visible">
                                {horses.map((horse) => (
                                    <label key={horse.id} className="flex items-center space-x-3 cursor-pointer text-sm">
                                        <input
                                            type="radio"
                                            name="horse"
                                            value={horse.id}
                                            checked={selectedHorseId === horse.id}
                                            onChange={() => setSelectedHorseId(horse.id)}
                                            className="accent-green-500"
                                        />
                                        <span>{horse.name} (Odds: {horse.odds}x)</span>
                                    </label>
                                ))}
                            </div>

                            <input
                                type="number"
                                placeholder="Enter bet amount"
                                value={betAmount.toString()}
                                onChange={(e) => {
                                    const raw = e.target.value;
                                    const num = parseFloat(raw);
                                    if (!isNaN(num)) {
                                        const truncated = Math.floor(num * 100) / 100;
                                        setBetAmount(truncated);
                                    } else {
                                        setBetAmount(0);
                                    }
                                }}
                                step="0.01"
                                min="0"
                                className="w-full px-4 py-2 bg-[#333] border border-gray-500 rounded text-white"
                            />

                            <button
                                onClick={handleStartRace}
                                className="mt-4 w-full bg-green-600 py-2 rounded hover:bg-green-700 disabled:bg-gray-600"
                                disabled={
                                    !selectedHorseId || betAmount <= 0 || betAmount > balance
                                }
                            >
                                Start Race
                            </button>
                        </div>
                    </div>
                )}

                {horses.map((horse, i) => (
                    <div
                        key={horse.id}
                        className="absolute flex flex-col items-center"
                        style={{
                            top: `${i * 70 + 20}px`,
                            left: `${positions[i]}%`,
                            transition: 'left 0.1s linear',
                        }}
                    >
                        <div className="w-14 h-12 flex items-center justify-center shadow-md">
                            <Image
                                src={horse.icon}
                                alt={horse.name}
                                width={60}
                                height={60}
                                unoptimized
                                className="w-full h-full object-contain rounded"
                            />
                        </div>
                        <span className="text-xs text-gray-300 mt-1 text-center w-24 truncate">{horse.name}</span>
                    </div>
                ))}

                {winner && (() => {
                    const selectedHorse = horses.find((h) => h.id === selectedHorseId);
                    const won = selectedHorse?.name === winner;
                    const payout = won ? betAmount * (selectedHorse?.odds ?? 1) * payoutMultiplier : 0;

                    return (
                        <div className="absolute inset-0 flex justify-center items-center bg-black bg-opacity-60 rounded-lg">
                            <div className="bg-[#1E1E1E] px-6 py-5 sm:px-8 sm:py-6 rounded-lg shadow-lg border border-green-600 text-center w-full max-w-sm">
                                <h3 className="text-2xl font-bold text-green-400 mb-2">🏆 Winner!</h3>
                                <p className="text-xl">{winner}</p>
                                <p className="text-sm text-gray-400 mt-2">
                                    {won ? `You won $${payout.toFixed(2)}!` : 'Better luck next time!'}
                                </p>
                                <button
                                    onClick={() => {
                                        const fresh = generateHorses(horseCount);
                                        setHorses(fresh);
                                        setPositions(new Array(horseCount).fill(0));
                                        setWinner(null);
                                        setBetAmount(0);
                                        setSelectedHorseId(null);
                                    }}
                                    className="mt-4 bg-green-600 px-5 py-2 rounded hover:bg-green-700"
                                >
                                    Play Again
                                </button>
                            </div>
                        </div>
                    );
                })()}

            </div>
        </div>
    </div>
);
};

export default RaceUI;
