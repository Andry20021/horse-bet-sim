'use client';
import { useEffect, useState, useCallback } from 'react';
import { auth, db } from './lib/firebaseConfig';
import { useRef } from 'react';
import { GrMoney } from "react-icons/gr";
import { IoChatbubblesOutline } from "react-icons/io5";
import { GiHorseHead } from "react-icons/gi";
import { IoLogoGithub } from "react-icons/io";
import { SiLinkedin } from "react-icons/si";
import { MdEmail } from "react-icons/md";
import Image from 'next/image';
import type { User } from 'firebase/auth';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { Pie } from 'react-chartjs-2';
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
  const [newUsername, setNewUsername] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
  const [horseCount, setHorseCount] = useState(3);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [positions, setPositions] = useState<number[]>([]);
  const [raceOn, setRaceOn] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [selectedHorseId, setSelectedHorseId] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [balance, setBalance] = useState(10000);
  const [chatInput, setChatInput] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showWallet, setShowWallet] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  type HorseStats = {
    totalWins: number;
    totalLosses: number;
    totalPayout: number;
  };

  const [horseStats, setHorseStats] = useState<Record<string, HorseStats>>({});

  const [liveFeed, setLiveFeed] = useState<string[]>([
    "Welcome to the Horse Racing Simulator!",
    "Made by Andry Astorga",
    "Enjoy!",
  ]);

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

  const handleLogout = async () => {
    await signOut(auth);
    setBalance(10000);
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!user || isNaN(amount) || amount <= 0) return;

    const balanceBefore = balance;
    const balanceAfter = balanceBefore + amount;

    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { balance: increment(amount) });
    setBalance(balanceAfter);

    await addDoc(collection(db, 'transactions'), {
      user: user.uid,
      type: 'deposit',
      amount,
      balanceBefore,
      balanceAfter,
      timestamp: Date.now(),
    });

    setDepositAmount('');
    setShowWallet(false);
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(depositAmount);
    if (!user || isNaN(amount) || amount <= 0 || amount > balance) return;

    const balanceBefore = balance;
    const balanceAfter = balanceBefore - amount;

    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { balance: increment(-amount) });
    setBalance(balanceAfter);

    await addDoc(collection(db, 'transactions'), {
      user: user.uid,
      type: 'withdrawal',
      amount,
      balanceBefore,
      balanceAfter,
      timestamp: Date.now(),
    });

    setDepositAmount('');
    setShowWallet(false);
  };

  return (
    <>
      <header className="w-full z-50 px-8 py-4 flex justify-between items-center bg-[#1A1A1A] shadow-md">
        <div className="text-2xl font-bold text-green-400">HorseStake</div>
        <div className="flex items-center space-x-6 text-sm text-gray-300">
          <a href="#" className="hover:text-white">Home</a>
          <a href="#" className="hover:text-white">Games</a>
          {!user && <></>}
          {user && (
            <>
              <button
                onClick={() => setShowWallet(true)}
                className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
              >
                Wallet
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowAvatarDropdown((prev) => !prev)}
                  className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center hover:bg-gray-500"
                  title={username}
                >
                  <span className="text-white text-sm font-semibold">{username.charAt(0).toUpperCase() || "?"}</span>
                </button>

                {showAvatarDropdown && (
                  <div className="absolute right-0 mt-2 bg-[#2B2B2B] border border-gray-700 rounded shadow-lg py-2 w-32 z-50">
                    <button
                      onClick={() => {
                        setShowProfile(true);
                        setShowAvatarDropdown(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-600"
                    >
                      Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-600"
                    >
                      Logout
                    </button>
                  </div>
                )}

              </div>

            </>
          )}
        </div>
      </header>

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

      {showWallet && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
          <div className="bg-[#1E1E1E] p-6 rounded-lg w-full max-w-sm text-white shadow-lg border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-center text-green-400">Wallet</h2>

            <div className="mb-4 text-center bg-[#2A2A2A] p-3 rounded border border-gray-600">
              <p className="text-sm text-gray-400">Current Balance</p>
              <p className="text-2xl font-bold text-green-300">${balance.toFixed(2)}</p>
            </div>

            <input
              type="number"
              placeholder="Enter amount"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full px-4 py-2 mb-4 bg-[#333] border border-gray-500 rounded text-white"
            />

            <div className="flex justify-between space-x-4">
              <button
                onClick={handleDeposit}
                className="bg-green-600 px-4 py-2 rounded hover:bg-green-700 w-1/2"
              >
                Deposit
              </button>
              <button
                onClick={handleWithdraw}
                className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 w-1/2"
              >
                Withdraw
              </button>
            </div>

            <button
              onClick={() => setShowWallet(false)}
              className="mt-4 w-full bg-gray-600 px-4 py-2 rounded hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showProfile && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
          <div className="bg-[#1E1E1E] p-6 rounded-lg w-full max-w-sm text-white shadow-lg border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-center text-green-400">Edit Profile</h2>

            <div className="mb-4">
              <label className="block mb-1 text-sm text-gray-300">New Username</label>
              <input
                type="text"
                placeholder="Enter new username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-4 py-2 bg-[#333] border border-gray-500 rounded text-white"
              />
            </div>

            <button
              onClick={async () => {
                const trimmed = newUsername.trim();
                if (!user || !trimmed) return;

                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, { username: trimmed });
                setUsername(trimmed);
                setNewUsername('');
                setShowProfile(false);
              }}
              className="w-full bg-green-600 hover:bg-green-700 py-2 rounded mb-3"
            >
              Save Changes
            </button>

            <button
              onClick={() => {
                setShowProfile(false);
                setNewUsername('');
              }}
              className="w-full bg-gray-600 hover:bg-gray-700 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}


      {user && (
        <main className="min-h-screen bg-[#0F0F0F] text-white font-sans">

          <section className="relative flex justify-center items-center py-16 px-4">
            <div className="absolute left-0 top-16 flex flex-col space-y-4 pl-8 z-30">
              {horses.map((horse) => {
                const stats = horseStats[horse.name];
                if (!stats) return null;

                const chartData = {
                  labels: ['Wins', 'Losses'],
                  datasets: [
                    {
                      data: [stats.totalWins, stats.totalLosses],
                      backgroundColor: ['#4CAF50', '#F44336'],
                      borderWidth: 0,
                    },
                  ],
                };

                return (
                  <div
                    key={horse.id}
                    className="bg-[#2B2B2B] p-4 pr-8 ml-3 rounded-xl mb-3 shadow-md flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Image
                        src={horse.icon}
                        alt={horse.name}
                        width={50}
                        height={50}
                        unoptimized
                        className="w-13 h-12 mr-4 rounded-full"
                      />

                      <div className='pl-5'>
                        <p className="text-white font-bold">{horse.name}</p>
                        <p className="text-sm text-gray-300">
                          Wins: {stats.totalWins} | Losses: {stats.totalLosses}
                        </p>
                        <p className="text-sm text-gray-400">
                          Payout: ${stats.totalPayout?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>

                    <div className="w-20 h-20 pl-3 ml-4">
                      <Pie
                        data={chartData}
                        options={{
                          plugins: {
                            legend: { display: false },
                          },
                          maintainAspectRatio: false,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-[#1E1E1E] w-full max-w-5xl aspect-video rounded-xl shadow-lg border border-gray-700 p-5 z-10">
              <div className="flex justify-between items-center mb-4">
                <GiHorseHead className="w-16 h-12 object-contain rounded" />

                <h2 className="text-xl font-semibold pl-26">Horse Racing Simulator</h2>

                <div className="flex items-center text-sm bg-[#333] px-4 py-2 rounded shadow border border-gray-600 space-x-2">
                  <GrMoney className='text-yellow-300' />
                  <span>Balance: ${balance.toFixed(2)}</span>
                </div>
              </div>


              <div className="relative h-full w-full bg-[#000000] rounded-lg overflow-hidden px-4 pt-2 pb-4">
                <div className="relative h-full w-full rounded-lg overflow-hidden px-4 pt-4 pb-8">
                  {!raceOn && !winner && (
                    <div className="absolute inset-0 flex flex-col justify-center items-center k bg-opacity-60 rounded-lg">
                      <div className="bg-[#1E1E1E] p-3 rounded-lg border border-gray-600 w-full max-w-md z-50 relative">
                        <h3 className="text-xl font-semibold mb-4 text-center">Place Your Bet</h3>
                        <label className="block mb-1">Number of Horses:</label>
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

                        <div className="space-y-3 mb-4">
                          {horses.map((horse) => (
                            <label key={horse.id} className="flex items-center space-x-3 cursor-pointer">
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
                        top: `${i * 80 + 20}px`,
                        left: `${positions[i]}%`,
                        transition: 'left 0.1s linear',
                      }}
                    >
                      <div className="w-14 h-12flex items-center justify-center shadow-md">
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
                      <div className="bg-[#1E1E1E] px-8 py-6 rounded-lg shadow-lg border border-green-600 text-center">
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


            <div className="absolute right-0 top-16 pl-1 pr-7 z-30 w-103">
              <div className="bg-[#1E1E1E] border border-gray-700 p-4 rounded-xl shadow-lg h-[32rem] flex flex-col">
                <h3 className="text-white font-semibold text-lg mb-3 flex items-center space-x-2">
                  <IoChatbubblesOutline />
                  <span>Live Chat</span>
                </h3>


                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {liveFeed.map((entry, index) => (
                    <div key={index} className="bg-[#2B2B2B] text-gray-300 text-sm p-2 rounded shadow-inner border border-gray-600">
                      {entry}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && chatInput.trim()) {
                        setLiveFeed((prev) => [...prev, `${username}: ${chatInput.trim()}`]);
                        setChatInput('');
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-l bg-[#333] text-white border-t border-l border-b border-gray-600 outline-none"
                  />
                  <button
                    onClick={() => {
                      if (chatInput.trim()) {
                        setLiveFeed((prev) => [...prev, `${username}: ${chatInput.trim()}`]);
                        setChatInput('');
                      }
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-r text-white text-sm border-t border-r border-b border-gray-600"
                  >
                    Send
                  </button>
                </div>
              </div>
              <div className="mt-4 flex justify-center space-x-6 text-gray-400 text-2xl">
                <a href="https://www.linkedin.com/in/andry-astorga-1835441b2/" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  <SiLinkedin />
                </a>
                <a href="https://github.com/andry20021" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  <IoLogoGithub />
                </a>
                <a href="mailto:andryastorga5@gmail.com" className="hover:text-white">
                  <MdEmail />
                </a>
              </div>

            </div>


          </section>
        </main>
      )}
    </>
  );
}
