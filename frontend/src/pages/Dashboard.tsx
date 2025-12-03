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
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-violet-200 border-t-violet-950"></div>
          <p className="text-sm text-violet-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold text-violet-950 tracking-tight mb-1.5">Dashboard</h1>
          <p className="text-sm text-violet-600">Overview of your RFP activities</p>
        </div>
        <Link
          to="/rfps/create"
          className="bg-violet-950 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-900 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
        >
          Create RFP
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {stats.map((stat, index) => {
          // Calculate percentage for progress bar (relative to max value or use a sensible scale)
          const maxValue = Math.max(...stats.map(s => s.value), 1);
          const percentage = maxValue > 0 ? Math.min((stat.value / maxValue) * 100, 100) : 0;
          
          return (
            <div 
              key={stat.name}
              style={{ animationDelay: `${index * 50}ms` }}
              className={`${stat.bgColor} p-6 rounded-xl border ${stat.borderColor} transition-all duration-300 hover:border-violet-400 hover:shadow-md hover:-translate-y-0.5 group`}
            >
              <div className="flex justify-between items-center mb-4">
                <p className={`text-xs font-medium ${stat.textColor} uppercase tracking-wider opacity-80`}>{stat.name}</p>
                <p className={`text-3xl font-bold ${stat.textColor} tabular-nums`}>{stat.value}</p>
              </div>
              <div className="h-1 rounded-full bg-violet-200/60 overflow-hidden">
                <div 
                  className={`h-full rounded-full bg-gradient-to-r ${stat.color} transition-all duration-700 ease-out group-hover:opacity-90`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent RFPs */}
      <div className="bg-white rounded-xl border border-violet-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4.5 border-b border-violet-100 bg-violet-50/30">
          <h2 className="text-lg font-semibold text-violet-950">Recent RFPs</h2>
        </div>
        {rfps.length === 0 ? (
          <div className="p-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-100 mb-4">
              <svg className="w-8 h-8 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-violet-700 font-medium mb-2">No RFPs yet</p>
            <Link to="/rfps/create" className="text-violet-950 hover:text-violet-700 font-medium text-sm transition-colors inline-flex items-center gap-1">
              Create your first RFP
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-violet-100">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider">Open Since</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-violet-700 uppercase tracking-wider">Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-50">
                {rfps.map((rfp, index) => (
                  <tr 
                    key={rfp.id} 
                    className="hover:bg-violet-50/60 transition-all duration-200 group"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="px-6 py-4">
                      <Link
                        to={`/rfps/${rfp.id}`}
                        className="text-sm font-medium text-violet-950 hover:text-violet-700 transition-colors inline-flex items-center gap-1.5 group-hover:gap-2"
                      >
                        {rfp.title}
                        <svg className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-violet-600">
                      {formatDate(rfp.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                        rfp.status === RfpStatus.DRAFT ? 'bg-violet-100 text-violet-700' :
                        rfp.status === RfpStatus.SENT ? 'bg-violet-200 text-violet-800' :
                        rfp.status === RfpStatus.EVALUATING ? 'bg-violet-300 text-violet-950' :
                        rfp.status === RfpStatus.AWARDED ? 'bg-violet-950 text-white shadow-sm' :
                        rfp.status === RfpStatus.CLOSED ? 'bg-violet-800 text-white shadow-sm' :
                        'bg-violet-100 text-violet-700'
                      }`}>
                        {RfpStatusLabel[rfp.status] || rfp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-violet-950 font-semibold text-right tabular-nums">
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
