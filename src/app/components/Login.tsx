'use client';

import React, { useState } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInAnonymously,
} from 'firebase/auth';
import {
    doc,
    setDoc,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebaseConfig';

const Login: React.FC = () => {
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [signupUsername, setSignupUsername] = useState('');

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

    const handleGuest = async () => {
        try {
            const guest = await signInAnonymously(auth);
            console.log('Guest session started with UID:', guest.user.uid);
        } catch (err) {
            const error = err as Error;
            alert('Guest login failed: ' + error.message);
        }
    };

    return (
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

                <button
                    onClick={handleGuest}
                    className="w-full bg-gray-700 hover:bg-gray-800 py-2 rounded mb-3 text-sm"
                >
                    Continue as Guest
                </button>

                <p className="text-center text-sm text-gray-400">
                    {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                    <button
                        className="underline text-green-400"
                        onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                    >
                        {authMode === 'login' ? 'Sign Up' : 'Log In'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Login;
