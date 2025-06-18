'use client';

import React, { useState } from 'react';
import { IoChatbubblesOutline } from 'react-icons/io5';
import { SiLinkedin } from 'react-icons/si';
import { IoLogoGithub } from 'react-icons/io';
import { MdEmail } from 'react-icons/md';

interface LiveChatProps {
  username: string;
}

const LiveChat: React.FC<LiveChatProps> = ({ username }) => {
  const [chatInput, setChatInput] = useState('');
  const [liveFeed, setLiveFeed] = useState<string[]>([
    "Welcome to the Horse Racing Simulator!",
    "Made by Andry Astorga",
    "Enjoy!",
  ]);

  const handleSend = () => {
    if (chatInput.trim()) {
      setLiveFeed((prev) => [...prev, `${username}: ${chatInput.trim()}`]);
      setChatInput('');
    }
  };

  return (
    <div className="w-full xl:w-1/5 z-30">
      <div className="bg-[#1E1E1E] border border-gray-700 p-4 rounded-xl shadow-lg h-[32rem] flex flex-col">
        <h3 className="text-white font-semibold text-lg mb-3 flex items-center space-x-2">
          <IoChatbubblesOutline />
          <span>Live Chat</span>
        </h3>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {liveFeed.map((entry, index) => (
            <div
              key={index}
              className="bg-[#2B2B2B] text-gray-300 text-sm p-2 rounded shadow-inner border border-gray-600"
            >
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
              if (e.key === 'Enter') handleSend();
            }}
            className="flex-1 px-3 py-2 rounded-l bg-[#333] text-white border-t border-l border-b border-gray-600 outline-none"
          />
          <button
            onClick={handleSend}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-r text-white text-sm border-t border-r border-b border-gray-600"
          >
            Send
          </button>
        </div>
      </div>

      <div className="mt-4 flex justify-center space-x-6 text-gray-400 text-2xl">
        <a
          href="https://www.linkedin.com/in/andry-astorga-1835441b2/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white"
        >
          <SiLinkedin />
        </a>
        <a
          href="https://github.com/andry20021"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white"
        >
          <IoLogoGithub />
        </a>
        <a href="mailto:andryastorga5@gmail.com" className="hover:text-white">
          <MdEmail />
        </a>
      </div>
    </div>
  );
};

export default LiveChat;
