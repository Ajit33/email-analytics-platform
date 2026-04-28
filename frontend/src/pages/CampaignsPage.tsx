import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { campaignsService, type Campaign } from '../services/campaigns';
import { Plus, Send, BarChart3, Clock } from 'lucide-react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCampaigns = async () => {
    try {
      const data = await campaignsService.getAll();
      setCampaigns(data);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campaigns</h1>
        <Link
          to="/campaigns/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
          <Mail className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No campaigns yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Create your first email campaign to get started
          </p>
          <Link
            to="/campaigns/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Campaign
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const [isSending, setIsSending] = useState(false);
  const [stats, setStats] = useState<{
    totalSent: number;
    totalOpens: number;
    totalClicks: number;
  } | null>(null);

  const handleSend = async () => {
    if (!confirm(`Send campaign "${campaign.name}" to all subscribers?`)) return;

    setIsSending(true);
    try {
      await campaignsService.send(campaign.id);
      alert('Campaign queued for sending!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to send campaign');
    } finally {
      setIsSending(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await campaignsService.getStats(campaign.id);
      setStats({
        totalSent: data.totalSent,
        totalOpens: data.totalOpens,
        totalClicks: data.totalClicks,
      });
    } catch {
      // Stats might not exist yet
    }
  };

  useEffect(() => {
    loadStats();
  }, [campaign.id]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {campaign.name}
        </h3>
        <Link
          to={`/campaigns/${campaign.id}`}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <BarChart3 className="w-5 h-5" />
        </Link>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
        {campaign.subject}
      </p>

      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Sent</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {stats.totalSent}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Opens</p>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
              {stats.totalOpens}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Clicks</p>
            <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {stats.totalClicks}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          {new Date(campaign.createdAt).toLocaleDateString()}
        </div>
        <button
          onClick={handleSend}
          disabled={isSending}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Send className="w-4 h-4" />
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

function Mail(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
