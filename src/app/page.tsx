'use client';
import Header from './components/Header';
import LiveChat from './components/LiveChat';
import HorseStats from './components/HorseStats';
import { useEffect, useState, useCallback } from 'react';
import { auth, db } from './lib/firebaseConfig';
import { useRef } from 'react';
import { GrMoney } from "react-icons/gr";
import { GiHorseHead } from "react-icons/gi";
import Image from 'next/image';
import type { User } from 'firebase/auth';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  collection,
  addDoc,
} from 'firebase/firestore';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
ChartJS.register(ArcElement, Tooltip, Legend);

type Horse = {
  id: number;
  name: string;
  odds: number;
  speed: number;
  icon: string;
};

const ALL_HORSE_NAMES = [
  'Thunderbolt', 'Midnight Dash', 'Lightning Strike', 'Storm Chaser', 'Rapid Flame',
  'Dust Runner', 'Shadow Sprint', 'Iron Hoof', 'Golden Gallop', 'Steel Comet',
  'Crimson Charger', 'Silver Mane', 'Blazing Star', 'Frost Wind', 'Solar Flash',
  'Dark Comet', 'Electric Whisper', 'Vortex Vixen', 'Blitz Phantom', 'Nova Runner'
];

const nameToIcon = (name: string) =>
  `/images/${name.toLowerCase().replace(/ /g, '-')}.png`;

export default function Home() {
  const raceEndedRef = useRef(false);
  const [signupUsername, setSignupUsername] = useState('');
  const [username, setUsername] = useState('');
  const [horseCount, setHorseCount] = useState(3);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [positions, setPositions] = useState<number[]>([]);
  const [raceOn, setRaceOn] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [selectedHorseId, setSelectedHorseId] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [balance, setBalance] = useState(10000);
  const [user, setUser] = useState<User | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  type HorseStats = {
    totalWins: number;
    totalLosses: number;
    totalPayout: number;
  };

  const [horseStats, setHorseStats] = useState<Record<string, HorseStats>>({});

  const payoutMultiplier = {
    3: 1.0,
    4: 1.2,
    5: 1.5,
    6: 2.0,
  }[horseCount] ?? 1.0;

  const generateHorses = (count: number): Horse[] => {
    const shuffled = [...ALL_HORSE_NAMES].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);
    return selected.map((name, i) => {
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

  const ensureAllHorsesExist = async () => {
    for (const name of ALL_HORSE_NAMES) {
      const horseRef = doc(db, 'horses', name);
      const docSnap = await getDoc(horseRef);
      if (!docSnap.exists()) {
        await setDoc(horseRef, {
          name,
          totalGames: 0,
          totalWins: 0,
          totalLosses: 0,
          totalPayout: 0,
        });
      }
    }
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
    ensureAllHorsesExist();
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
    const freshHorses = generateHorses(horseCount);
    setHorses(freshHorses);
    setPositions(new Array(freshHorses.length).fill(0));
  }, [horseCount]);

  useEffect(() => {
    if (horses.length === 0) return;
    loadStats();
  }, [horses, loadStats]);

  useEffect(() => {
    if (!raceOn) return;

    const handleRaceEnd = async (
      winningHorseName: string,
      selectedHorse: Horse,
      bet: number,
      profit: number,
      payout: number,
      won: boolean
    ) => {
      const matchData = {
        user: user?.uid || 'unknown',
        bet: bet,
        odds: selectedHorse.odds,
        profit: profit,
        result: won ? 'win' : 'loss',
        selectedHorse: selectedHorse.name,
        winningHorse: winningHorseName,
        timestamp: Date.now(),
      };

      try {
        await Promise.all(
          horses.map((horse) => {
            const ref = doc(db, 'horses', horse.name);
            return updateDoc(ref, {
              totalGames: increment(1),
              totalWins: increment(horse.name === winningHorseName ? 1 : 0),
              totalLosses: increment(horse.name !== winningHorseName ? 1 : 0),
            });
          })
        );

        if (won) {
          const winningHorseRef = doc(db, 'horses', selectedHorse.name);
          await updateDoc(winningHorseRef, {
            totalPayout: increment(payout),
          });
        }

        if (user) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            totalGames: increment(1),
            totalWins: increment(won ? 1 : 0),
            totalLosses: increment(won ? 0 : 1),
            totalProfit: increment(profit),
            ...(won ? { balance: increment(payout) } : {}),
          });
        }

        const matchRef = collection(db, 'matchHistory');
        await addDoc(matchRef, matchData);
      } catch (err) {
        console.error('Failed to handle race end:', err);
      }
    };

    const interval = setInterval(() => {
      setPositions((prev) => {
        const newPositions = prev.map((pos, i) =>
          Math.min(pos + Math.random() * horses[i].speed, 100)
        );
        const winningIndex = newPositions.findIndex((pos) => pos >= 100);
        if (winningIndex !== -1) {
          clearInterval(interval);
          setRaceOn(false);
          const winningHorse = horses[winningIndex];
          setWinner(winningHorse.name);
          const selectedHorse = horses.find((h) => h.id === selectedHorseId);
          const bet = parseFloat(betAmount);
          if (!selectedHorse || isNaN(bet)) return newPositions;

          const won = selectedHorse.name === winningHorse.name;
          const payout = won ? bet * selectedHorse.odds * payoutMultiplier : 0;
          const profit = won ? payout - bet : -bet;

          if (won) {
            const winningHorseRef = doc(db, 'horses', selectedHorse.name);
            updateDoc(winningHorseRef, {
              totalPayout: increment(payout),
            });
          }

          if (won) {
            setBalance((prev) => prev + payout);
          }

          if (!raceEndedRef.current) {
            raceEndedRef.current = true;
            handleRaceEnd(winningHorse.name, selectedHorse, bet, profit, payout, won);
          }
        }
        return newPositions;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [raceOn, horses, betAmount, payoutMultiplier, selectedHorseId, user]);

  const handleStartRace = () => {
    raceEndedRef.current = false;
    const bet = parseFloat(betAmount);
    if (!selectedHorseId || isNaN(bet) || bet <= 0 || bet > balance) return;
    setBalance((prev) => prev - bet);
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, { balance: increment(-bet) });
    }
    setWinner(null);
    setPositions(new Array(horses.length).fill(0));
    setRaceOn(true);
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (err) {
      const error = err as Error;
      alert('Login failed: ' + error.message);
    }
  };

  const handleSignup = async () => {
    try {
      const trimmedUsername = signupUsername.trim();

      if (!trimmedUsername) {
        alert('Username is required.');
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
      const userRef = doc(db, 'users', userCredential.user.uid);

      await setDoc(userRef, {
        username: trimmedUsername,
        balance: 10000,
        totalGames: 0,
        totalWins: 0,
        totalLosses: 0,
        totalProfit: 0,
      });

      setSignupUsername('');
    } catch (err) {
      const error = err as Error;
      alert('Signup failed: ' + error.message);
    }
  };

  return (
    <>
      <Header
        user={user}
        username={username}
        balance={balance}
        setBalance={setBalance}
        setUsername={setUsername}
      />

      {!user && (
        <div className="fixed inset-0 z-40 flex justify-center items-center bg-black/70">
          <div className="bg-[#1E1E1E] p-8 rounded-lg shadow-lg w-full max-w-sm text-white">
            <h2 className="text-2xl font-semibold mb-4 text-center">
              {authMode === 'login' ? 'Log In' : 'Sign Up'}
            </h2>

            {authMode === 'signup' && (
              <input
                type="text"
                placeholder="Username"
                value={signupUsername}
                onChange={(e) => setSignupUsername(e.target.value)}
                className="w-full mb-3 px-4 py-2 rounded bg-[#333] border border-gray-600 text-white"
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full mb-3 px-4 py-2 rounded bg-[#333] border border-gray-600"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full mb-3 px-4 py-2 rounded bg-[#333] border border-gray-600"
            />
            <button
              onClick={authMode === 'login' ? handleLogin : handleSignup}
              className="w-full bg-green-600 hover:bg-green-700 py-2 rounded mb-3"
            >
              {authMode === 'login' ? 'Log In' : 'Sign Up'}
            </button>
            <p className="text-center text-sm text-gray-400">
              {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                className="underline text-green-400"
                onClick={() =>
                  setAuthMode(authMode === 'login' ? 'signup' : 'login')
                }
              >
                {authMode === 'login' ? 'Sign Up' : 'Log In'}
              </button>
            </p>
          </div>
        </div>
      )}

      {user && (
        <main className="min-h-screen bg-[#0F0F0F] text-white font-sans">
          <section className="relative flex flex-wrap xl:flex-nowrap justify-center items-start py-16 px-4 gap-4">

          <HorseStats horses={horses} horseStats={horseStats} />

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
                            <option key={count} value={count}>
                              {count} Horses
                            </option>
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
                          value={betAmount}
                          onChange={(e) => setBetAmount(e.target.value)}
                          className="w-full px-4 py-2 bg-[#333] border border-gray-500 rounded text-white"
                        />

                        <button
                          onClick={handleStartRace}
                          className="mt-4 w-full bg-green-600 py-2 rounded hover:bg-green-700 disabled:bg-gray-600"
                          disabled={
                            !selectedHorseId ||
                            !betAmount ||
                            parseFloat(betAmount) <= 0 ||
                            parseFloat(betAmount) > balance
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
                      <span className="text-xs text-gray-300 mt-1 text-center w-24 truncate">
                        {horse.name}
                      </span>
                    </div>
                  ))}

                  {winner && (
                    <div className="absolute inset-0 flex justify-center items-center bg-black bg-opacity-60 rounded-lg">
                      <div className="bg-[#1E1E1E] px-6 py-5 sm:px-8 sm:py-6 rounded-lg shadow-lg border border-green-600 text-center w-full max-w-sm">
                        <h3 className="text-2xl font-bold text-green-400 mb-2">🏆 Winner!</h3>
                        <p className="text-xl">{winner}</p>
                        <p className="text-sm text-gray-400 mt-2">
                          {horses.find((h) => h.id === selectedHorseId)?.name === winner
                            ? `You won $${(
                              parseFloat(betAmount) *
                              horses.find((h) => h.id === selectedHorseId)!.odds *
                              payoutMultiplier
                            ).toFixed(2)}!`
                            : 'Better luck next time!'}
                        </p>
                        <button
                          onClick={() => {
                            const fresh = generateHorses(horseCount);
                            setHorses(fresh);
                            setPositions(new Array(horseCount).fill(0));
                            setWinner(null);
                            setBetAmount('');
                            setSelectedHorseId(null);
                          }}
                          className="mt-4 bg-green-600 px-5 py-2 rounded hover:bg-green-700"
                        >
                          Play Again
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>


            <LiveChat username={username} />


          </section>
        </main>
      )}

    </>
  );
}
