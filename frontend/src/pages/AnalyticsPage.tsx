import { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { clickStatsService, type ClickEvent } from '../services/clickStats';
import { campaignsService, type Campaign } from '../services/campaigns';
import { Globe, Monitor, MousePointer, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

export default function AnalyticsPage() {
  const { socket } = useSocket();
  const [events, setEvents] = useState<ClickEvent[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [clickEvents, allCampaigns] = await Promise.all([
        clickStatsService.getEvents(),
        campaignsService.getAll(),
      ]);
      setEvents(clickEvents);
      setCampaigns(allCampaigns);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleClick = () => {
      loadData();
    };

    socket.on('click.processed', handleClick);
    return () => {
      socket.off('click.processed', handleClick);
    };
  }, [socket]);

  // Aggregate data
  const clicksByCountry = events.reduce((acc, e) => {
    const country = e.country || 'Unknown';
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const clicksByDevice = events.reduce((acc, e) => {
    const device = e.deviceType || 'Unknown';
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const clicksByDay = events.reduce((acc, e) => {
    const day = new Date(e.clickedAt).toLocaleDateString();
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const countryData = Object.entries(clicksByCountry)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const deviceData = Object.entries(clicksByDevice).map(([name, value]) => ({ name, value }));

  const lineData = Object.entries(clicksByDay)
    .map(([name, value]) => ({ name, clicks: value }))
    .slice(-14);

  const COLORS = ['#6366F1', '#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <MousePointer className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Clicks</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{events.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Countries</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{Object.keys(clicksByCountry).length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <Monitor className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Device Types</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{Object.keys(clicksByDevice).length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Campaigns</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{campaigns.length}</p>
        </div>
      </div>

      {/* Clicks Over Time */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Clicks Over Time (Last 14 Days)
        </h3>
        {lineData.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No click data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="name" stroke="#6B7280" fontSize={12} angle={-45} textAnchor="end" height={60} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Line type="monotone" dataKey="clicks" stroke="#6366F1" strokeWidth={2} dot={{ fill: '#6366F1' }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clicks by Country */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Clicks by Country
          </h3>
          {countryData.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No geographic data yet</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={countryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="name" stroke="#6B7280" fontSize={12} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#6B7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="value" fill="#6366F1" name="Clicks" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                {countryData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Clicks by Device */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Clicks by Device Type
          </h3>
          {deviceData.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No device data yet</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deviceData.map(( _, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {deviceData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{item.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Click Events Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Click Events
        </h3>
        {events.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No click events recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3 font-medium">Time</th>
                  <th className="pb-3 font-medium">IP Address</th>
                  <th className="pb-3 font-medium">Country</th>
                  <th className="pb-3 font-medium">Device</th>
                  <th className="pb-3 font-medium">Browser</th>
                  <th className="pb-3 font-medium">OS</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {events.slice(0, 20).map((click) => (
                  <tr
                    key={click.id}
                    className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <td className="py-3 text-gray-900 dark:text-white whitespace-nowrap">
                      {new Date(click.clickedAt).toLocaleString()}
                    </td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{click.ipAddress}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{click.country || 'Unknown'}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{click.deviceType || 'Unknown'}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{click.browser || 'Unknown'}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{click.os || 'Unknown'}</td>
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
