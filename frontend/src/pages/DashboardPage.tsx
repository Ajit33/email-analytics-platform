import { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { campaignsService, type CampaignStats } from '../services/campaigns';
import { subscribersService, type SubscriberStats } from '../services/subscribers';
import { clickStatsService, type ClickEvent } from '../services/clickStats';
import { Mail, Users, MousePointer, TrendingUp, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const { socket, isConnected } = useSocket();
  const [campaignStats, setCampaignStats] = useState<CampaignStats[]>([]);
  const [subscriberStats, setSubscriberStats] = useState<SubscriberStats | null>(null);
  const [recentClicks, setRecentClicks] = useState<ClickEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [campaigns, subsStats, clicks] = await Promise.all([
        campaignsService.getAll().then((cs) =>
          Promise.all(cs.map((c) => campaignsService.getStats(c.id).catch(() => null)))
        ),
        subscribersService.getStats(),
        clickStatsService.getEvents(),
      ]);

      setCampaignStats(campaigns.filter((s): s is CampaignStats => s !== null));
      setSubscriberStats(subsStats);
      setRecentClicks(clicks.slice(0, 10));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleClickProcessed = (data: any) => {
      console.log('Click processed:', data);
      loadData(); // Refresh data
    };

    const handleEmailProcessed = (data: any) => {
      console.log('Email processed:', data);
      loadData(); // Refresh data
    };

    socket.on('click.processed', handleClickProcessed);
    socket.on('email.processed', handleEmailProcessed);

    return () => {
      socket.off('click.processed', handleClickProcessed);
      socket.off('email.processed', handleEmailProcessed);
    };
  }, [socket]);

  const totalStats = campaignStats.reduce(
    (acc, stat) => ({
      sent: acc.sent + stat.totalSent,
      opens: acc.opens + stat.totalOpens,
      clicks: acc.clicks + stat.totalClicks,
    }),
    { sent: 0, opens: 0, clicks: 0 }
  );

  const openRate = totalStats.sent > 0 ? ((totalStats.opens / totalStats.sent) * 100).toFixed(1) : '0';
  const clickRate = totalStats.sent > 0 ? ((totalStats.clicks / totalStats.sent) * 100).toFixed(1) : '0';

  const chartData = campaignStats.map((stat) => ({
    name: stat.campaign.name.slice(0, 20) + (stat.campaign.name.length > 20 ? '...' : ''),
    sent: stat.totalSent,
    opens: stat.totalOpens,
    clicks: stat.totalClicks,
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Emails Sent"
          value={totalStats.sent.toLocaleString()}
          icon={Mail}
          color="indigo"
        />
        <StatCard
          title="Total Opens"
          value={totalStats.opens.toLocaleString()}
          icon={Activity}
          color="green"
        />
        <StatCard
          title="Total Clicks"
          value={totalStats.clicks.toLocaleString()}
          icon={MousePointer}
          color="blue"
        />
        <StatCard
          title="Active Subscribers"
          value={subscriberStats?.active.toLocaleString() || '0'}
          icon={Users}
          color="purple"
        />
      </div>

      {/* Rates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Open Rate</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{openRate}%</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {totalStats.opens} opens from {totalStats.sent} emails
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <MousePointer className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Click Rate</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{clickRate}%</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {totalStats.clicks} clicks from {totalStats.sent} emails
          </p>
        </div>
      </div>

      {/* Campaign Performance Chart */}
      {campaignStats.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Campaign Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Bar dataKey="sent" fill="#6366F1" name="Sent" />
              <Bar dataKey="opens" fill="#22C55E" name="Opens" />
              <Bar dataKey="clicks" fill="#3B82F6" name="Clicks" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Clicks */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Clicks
        </h3>
        {recentClicks.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No recent clicks</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3 font-medium">Time</th>
                  <th className="pb-3 font-medium">IP Address</th>
                  <th className="pb-3 font-medium">Device</th>
                  <th className="pb-3 font-medium">Browser</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {recentClicks.map((click) => (
                  <tr
                    key={click.id}
                    className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <td className="py-3 text-gray-900 dark:text-white">
                      {new Date(click.clickedAt).toLocaleString()}
                    </td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{click.ipAddress}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">
                      {click.deviceType || 'Unknown'}
                    </td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">
                      {click.browser || 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: any;
  color: 'indigo' | 'green' | 'blue' | 'purple';
}) {
  const colors = {
    indigo: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    green: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
