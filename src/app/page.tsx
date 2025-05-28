'use client';
import { useEffect, useState } from 'react';
import { auth, db } from './lib/firebaseConfig';
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
} from 'firebase/firestore';

type Horse = {
  id: number;
  name: string;
  odds: number;
  speed: number;
};

const ALL_HORSE_NAMES = [
  'Thunderbolt', 'Midnight Dash', 'Lightning Strike', 'Storm Chaser', 'Rapid Flame',
  'Dust Runner', 'Shadow Sprint', 'Iron Hoof', 'Golden Gallop', 'Steel Comet',
  'Crimson Charger', 'Silver Mane', 'Blazing Star', 'Frost Wind', 'Solar Flash',
  'Dark Comet', 'Electric Whisper', 'Vortex Vixen', 'Blitz Phantom', 'Nova Runner'
];

export default function Home() {
  const [horseCount, setHorseCount] = useState(3);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [positions, setPositions] = useState<number[]>([]);
  const [raceOn, setRaceOn] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [selectedHorseId, setSelectedHorseId] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [balance, setBalance] = useState(10000);

  const [user, setUser] = useState<any>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const [showAddFunds, setShowAddFunds] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  const payoutMultiplier = {
    3: 1.0,
    4: 1.2,
    5: 1.5,
    6: 2.0,
  }[horseCount];

  const generateHorses = (count: number): Horse[] => {
    const shuffledNames = [...ALL_HORSE_NAMES].sort(() => 0.5 - Math.random());
    const selectedNames = shuffledNames.slice(0, count);
    return selectedNames.map((name, index) => {
      const odds = parseFloat((Math.random() * 2 + 1.5).toFixed(2));
      const speed = 4.5 - odds;
      return { id: index + 1, name, odds, speed };
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        await ensureAllHorsesExist();
        const userRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.balance !== undefined) setBalance(data.balance);
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
    if (!raceOn) return;
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

          horses.forEach((horse) => {
            const ref = doc(db, 'horses', horse.name);
            updateDoc(ref, {
              totalGames: increment(1),
              totalWins: increment(horse.name === winningHorse.name ? 1 : 0),
              totalLosses: increment(horse.name !== winningHorse.name ? 1 : 0),
            });
          });

          const won = selectedHorse.name === winningHorse.name;
          const payout = won ? bet * selectedHorse.odds * payoutMultiplier : 0;
          const profit = won ? payout - bet : -bet;

          if (won) {
            const winningHorseRef = doc(db, 'horses', selectedHorse.name);
            updateDoc(winningHorseRef, {
              totalPayout: increment(payout),
            });
          }

          const matchData = {
            amount: bet,
            odds: selectedHorse.odds,
            result: won ? 'win' : 'loss',
            selectedHorse: selectedHorse.name,
            winningHorse: winningHorse.name,
            profit: profit,
            timestamp: Date.now(),
          };

          if (user) {
            const userRef = doc(db, 'users', user.uid);
            updateDoc(userRef, {
              totalGames: increment(1),
              totalWins: increment(won ? 1 : 0),
              totalLosses: increment(won ? 0 : 1),
              totalProfit: increment(profit),
              ...(won ? { balance: increment(payout) } : {}),
            });
            setBalance((prev) => prev + profit + (won ? bet : 0));

            const matchRef = collection(userRef, 'matchHistory');
            addDoc(matchRef, matchData);
          }

          const globalMatchRef = collection(db, 'globalMatchHistory');
          addDoc(globalMatchRef, matchData);
        }
        return newPositions;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [raceOn, horses]);

  const handleStartRace = () => {
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
    } catch (err: any) {
      alert('Login failed: ' + err.message);
    }
  };

  const handleSignup = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
      const userRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userRef, {
        balance: 10000,
        totalGames: 0,
        totalWins: 0,
        totalLosses: 0,
        totalProfit: 0,
      });
    } catch (err: any) {
      alert('Signup failed: ' + err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setBalance(10000);
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!user || isNaN(amount) || amount <= 0) return;
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { balance: increment(amount) });
    setBalance((prev) => prev + amount);
    setDepositAmount('');
    setShowAddFunds(false);
  };
  return (
    <>
      <header className="w-full z-50 px-8 py-4 flex justify-between items-center bg-[#1A1A1A] shadow-md">
        <div className="text-2xl font-bold text-green-400">HorseStake</div>
        <div className="flex items-center space-x-6 text-sm text-gray-300">
          <a href="#" className="hover:text-white">Home</a>
          <a href="#" className="hover:text-white">Games</a>
          <a href="#" className="hover:text-white">Rewards</a>
          {!user && <></>}
          {user && (
            <>
              <button
                onClick={() => setShowAddFunds(true)}
                className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
              >
                Add Funds
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </header>

      {!user && (
        <div className="fixed inset-0 z-40 flex justify-center items-center bg-black bg-opacity-80">
          <div className="bg-[#1E1E1E] p-8 rounded-lg shadow-lg w-full max-w-sm text-white">
            <h2 className="text-2xl font-semibold mb-4 text-center">
              {authMode === 'login' ? 'Log In' : 'Sign Up'}
            </h2>
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

      {showAddFunds && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <div className="bg-[#1E1E1E] p-6 rounded-lg w-full max-w-sm text-white shadow-lg border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-center">Add Funds</h2>
            <input
              type="number"
              placeholder="Enter amount"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full px-4 py-2 mb-4 bg-[#333] border border-gray-500 rounded"
            />
            <div className="flex justify-between">
              <button
                onClick={handleDeposit}
                className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
              >
                Deposit
              </button>
              <button
                onClick={() => setShowAddFunds(false)}
                className="bg-gray-600 px-4 py-2 rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {user && (
        <main className="min-h-screen bg-[#0F0F0F] text-white font-sans">
          <section className="flex justify-center items-center py-16 px-4">
            <div className="bg-[#1E1E1E] w-full max-w-5xl aspect-video rounded-xl shadow-lg border border-gray-700 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">🏇 Horse Racing Simulator</h2>
                <div className="text-sm bg-[#333] px-4 py-2 rounded shadow border border-gray-600">
                  💰 Balance: ${balance.toLocaleString()}
                </div>
              </div>

              <div className="relative h-full w-full bg-[#2A2A2A] rounded-lg overflow-hidden px-4 pt-4 pb-8">
                {!raceOn && !winner && (
                  <div className="absolute inset-0 flex flex-col justify-center items-center bg-black bg-opacity-60 rounded-lg">
                    <div className="bg-[#1E1E1E] p-6 rounded-lg border border-gray-600 w-full max-w-md">
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
                    <div className="w-16 h-10 rounded bg-white text-black flex items-center justify-center text-sm font-bold shadow">
                      🐎
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
          </section>
        </main>
      )}
    </>
  );
}
