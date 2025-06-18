'use client';

import React, { useState } from 'react';
import { signOut, User } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseConfig';

interface HeaderProps {
  user: User | null;
  username: string;
  balance: number;
  setBalance: (val: number) => void;
  setUsername: (val: string) => void;
}

const Header: React.FC<HeaderProps> = ({ user, username, balance, setBalance, setUsername }) => {
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [newUsername, setNewUsername] = useState('');

  const handleLogout = async () => {
    await signOut(auth);
    setShowAvatarDropdown(false);
  };

  const handleDeposit = () => {
    const amt = parseFloat(depositAmount);
    if (!isNaN(amt) && amt > 0) {
      setBalance(balance + amt);
      setDepositAmount('');
    }
  };

  const handleWithdraw = () => {
    const amt = parseFloat(depositAmount);
    if (!isNaN(amt) && amt > 0 && amt <= balance) {
      setBalance(balance - amt);
      setDepositAmount('');
    }
  };

  return (
    <>
      <header className="w-full z-50 px-4 sm:px-8 py-4 bg-[#1A1A1A] shadow-md">
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold text-green-400">HorsePicks</div>

          <button
            className="text-white sm:hidden"
            onClick={() => setShowAvatarDropdown((prev) => !prev)}
          >
            ☰
          </button>

          <div className="hidden sm:flex items-center space-x-6 text-sm text-gray-300">
            <a href="#" className="hover:text-white">Home</a>
            <a href="#" className="hover:text-white">Games</a>
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
                    <span className="text-white text-sm font-semibold">
                      {username.charAt(0).toUpperCase() || "?"}
                    </span>
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
        </div>

        {showAvatarDropdown && (
          <div className="sm:hidden mt-3 space-y-2 text-sm text-gray-300">
            <a href="#" className="block px-2 py-1 hover:text-white">Home</a>
            <a href="#" className="block px-2 py-1 hover:text-white">Games</a>
            {user && (
              <>
                <button
                  onClick={() => setShowWallet(true)}
                  className="block w-full text-left bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white"
                >
                  Wallet
                </button>
                <button
                  onClick={() => {
                    setShowProfile(true);
                    setShowAvatarDropdown(false);
                  }}
                  className="block w-full text-left px-2 py-1 hover:bg-gray-600 text-white"
                >
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-2 py-1 hover:bg-gray-600 text-white"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        )}
      </header>

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
    </>
  );
};

export default Header;