import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { rfpApi, vendorApi } from '../services/api';
import { RfpStatus, RfpStatusLabel } from '../types';
import type { Rfp, Vendor } from '../types';

export default function Dashboard() {
  const [rfps, setRfps] = useState<Rfp[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rfpData, vendorData] = await Promise.all([
          rfpApi.getAll({ limit: 5 }),
          vendorApi.getAll({ limit: 100 }),
        ]);
        setRfps(rfpData.rfps);
        setVendors(vendorData.vendors);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const stats = [
    { 
      name: 'Total RFPs', 
      value: rfps.length,
      color: 'from-violet-950 to-violet-900',
      bgColor: 'bg-violet-50',
      borderColor: 'border-violet-300',
      textColor: 'text-violet-950',
    },
    { 
      name: 'Active Vendors', 
      value: vendors.filter(v => v.isActive).length,
      color: 'from-violet-950 to-violet-900',
      bgColor: 'bg-violet-50',
      borderColor: 'border-violet-300',
      textColor: 'text-violet-950',
    },
    { 
      name: 'Pending Responses', 
      value: rfps.filter(r => r.status === RfpStatus.SENT).length,
      color: 'from-violet-950 to-violet-900',
      bgColor: 'bg-violet-50',
      borderColor: 'border-violet-300',
      textColor: 'text-violet-950',
    },
    { 
      name: 'Under Evaluation', 
      value: rfps.filter(r => r.status === RfpStatus.EVALUATING).length,
      color: 'from-violet-950 to-violet-900',
      bgColor: 'bg-violet-50',
      borderColor: 'border-violet-300',
      textColor: 'text-violet-950',
    },
  ];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    
    // Normalize both dates to midnight in local timezone for accurate day comparison
    const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Calculate difference in days
    const diffTime = nowMidnight.getTime() - dateMidnight.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const formatCurrency = (amount: number, currency?: string) => {
    return `${currency || ''} ${amount.toLocaleString()}`.trim();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-violet-950 tracking-tight">Dashboard</h1>
          <p className="text-sm text-violet-600 mt-1">Overview of your RFP activities</p>
        </div>
        <Link
          to="/rfps/create"
          className="bg-violet-950 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-900 transition-colors duration-150 shadow-sm hover:shadow"
        >
          Create RFP
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <div 
            key={stat.name} 
            className={`${stat.bgColor} p-6 rounded-lg border ${stat.borderColor} transition-all duration-200 hover:border-violet-400`}
          >
            <p className={`text-xs font-medium ${stat.textColor} uppercase tracking-wider mb-2`}>{stat.name}</p>
            <p className={`text-3xl font-semibold ${stat.textColor} mb-3`}>{stat.value}</p>
            <div className={`h-0.5 rounded-full bg-gradient-to-r ${stat.color}`}></div>
          </div>
        ))}
      </div>

      {/* Recent RFPs */}
      <div className="bg-white rounded-lg border border-violet-100 shadow-sm">
        <div className="px-6 py-4 border-b border-violet-100">
          <h2 className="text-lg font-semibold text-violet-950">Recent RFPs</h2>
        </div>
        {rfps.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-violet-600 mb-2">No RFPs yet</p>
            <Link to="/rfps/create" className="text-violet-950 hover:text-violet-900 font-medium text-sm">Create your first RFP</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-violet-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider">Open Since</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-violet-700 uppercase tracking-wider">Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-50">
                {rfps.map((rfp) => (
                  <tr key={rfp.id} className="hover:bg-violet-50/50 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <Link
                        to={`/rfps/${rfp.id}`}
                        className="text-sm font-medium text-violet-950 hover:text-violet-700 transition-colors"
                      >
                        {rfp.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-violet-600">
                      {formatDate(rfp.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-md ${
                        rfp.status === RfpStatus.DRAFT ? 'bg-violet-100 text-violet-700' :
                        rfp.status === RfpStatus.SENT ? 'bg-violet-200 text-violet-800' :
                        rfp.status === RfpStatus.EVALUATING ? 'bg-violet-300 text-violet-950' :
                        rfp.status === RfpStatus.AWARDED ? 'bg-violet-950 text-white' :
                        rfp.status === RfpStatus.CLOSED ? 'bg-violet-800 text-white' :
                        'bg-violet-100 text-violet-700'
                      }`}>
                        {RfpStatusLabel[rfp.status] || rfp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-violet-950 font-medium text-right">
                      {rfp.budget ? formatCurrency(rfp.budget, rfp.currency) : '-'}
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
