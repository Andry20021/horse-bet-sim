'use client';

import React from 'react';
import Image from 'next/image';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Horse {
  id: number;
  name: string;
  icon: string;
}

interface Stats {
  totalWins: number;
  totalLosses: number;
  totalPayout: number;
}

interface HorseStatsProps {
  horses: Horse[];
  horseStats: { [horseName: string]: Stats };
}

const HorseStats: React.FC<HorseStatsProps> = ({ horses, horseStats }) => {
  return (
    <div className="w-full xl:w-1/5 flex flex-col space-y-4 z-30 ">
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
            className="bg-[#2B2B2B] p-4 rounded-xl shadow-lg flex items-center justify-between border border-gray-700"
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
              <div className="pl-5">
                <p className="text-white font-bold">{horse.name}</p>
                <p className="text-sm text-gray-300">
                  Wins: {stats.totalWins} | Losses: {stats.totalLosses}
                </p>
                <p className="text-sm text-gray-400">
                  Payout: ${stats.totalPayout?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
            <div className="w-20 h-20 pl-3">
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
  );
};

export default HorseStats;
