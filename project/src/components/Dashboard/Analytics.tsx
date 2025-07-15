
import React, { useState, useEffect } from 'react';
import { TrendingUp, Clock, Target } from 'lucide-react';
import { apiService } from '../../services/api';
import { DashboardAnalytics } from '../../types';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement);

const Analytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const analyticsData = await apiService.getDashboardAnalytics();
        setAnalytics(analyticsData);
      } catch (error: any) {
        toast.error(`Failed to fetch analytics: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gradient-to-b from-gray-900 to-indigo-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 bg-gradient-to-b from-gray-900 to-indigo-900">
        <p className="text-lg text-white">Failed to load analytics data</p>
      </div>
    );
  }

  // Line chart for weekly study time
  const studyTimeData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Study Time (hours)',
        data: analytics.weeklyStats.dailyStudyTime?.length ? analytics.weeklyStats.dailyStudyTime : [0, 0, 0, 0, 0, 0, 0],
        borderColor: '#22d3ee',
        backgroundColor: 'rgba(34, 211, 238, 0.2)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Bar chart for subject progress
  const subjectProgressData = {
    labels: analytics.subjectProgress.details?.map((s) => s.name) || [],
    datasets: [
      {
        label: 'Progress (%)',
        data: analytics.subjectProgress.details?.map((s) => s.progress) || [],
        backgroundColor: '#67e8f9',
        borderColor: '#22d3ee',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Hours', color: '#e5e7eb' },
        ticks: { color: '#e5e7eb' },
      },
      x: {
        title: { display: true, text: 'Day', color: '#e5e7eb' },
        ticks: { color: '#e5e7eb' },
      },
    },
    plugins: {
      legend: { labels: { color: '#e5e7eb' } },
    },
  };

  const barOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: { display: true, text: 'Progress (%)', color: '#e5e7eb' },
        ticks: { color: '#e5e7eb' },
      },
      x: {
        title: { display: true, text: 'Subject', color: '#e5e7eb' },
        ticks: { color: '#e5e7eb' },
      },
    },
    plugins: {
      legend: { labels: { color: '#e5e7eb' } },
    },
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-b from-gray-900 to-indigo-900 min-h-screen">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
      <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-lg shadow-lg p-6 transform hover:scale-105 transition-transform duration-300 animate-fade-in">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
          <TrendingUp className="h-8 w-8 text-cyan-400 mr-2 animate-pulse" />
          Analytics
        </h1>
        <p className="text-gray-300">Track your learning progress</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
        <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-cyan-400" />
            Weekly Study Time
          </h2>
          <Line data={studyTimeData} options={chartOptions} />
        </div>

        <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Target className="h-5 w-5 mr-2 text-cyan-400" />
            Subject Progress
          </h2>
          <Bar data={subjectProgressData} options={barOptions} />
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-800 to-purple-800 rounded-lg shadow-lg p-6 animate-fade-in">
        <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white bg-opacity-10 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-cyan-300">{(analytics.weeklyStats.totalStudyTime / 60).toFixed(1)}h</p>
            <p className="text-gray-300">Total Study Time</p>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-cyan-300">{analytics.weeklyStats.totalSessions}</p>
            <p className="text-gray-300">Sessions Completed</p>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-cyan-300">{analytics.weeklyStats.averageFocus.toFixed(1)}/10</p>
            <p className="text-gray-300">Average Focus</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
