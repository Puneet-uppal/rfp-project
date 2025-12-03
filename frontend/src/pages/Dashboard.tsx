import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { rfpApi, vendorApi } from '../services/api';
import { RfpStatus, RfpStatusLabel } from '../types';
import type { Rfp, Vendor } from '../types';

export default function Dashboard() {
  const [rfps, setRfps] = useState<Rfp[]>([]);
  const [allRfps, setAllRfps] = useState<Rfp[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [totalRfps, setTotalRfps] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all RFPs for accurate calculations and counts
        const [rfpDataForTable, allRfpsData, vendorData] = await Promise.all([
          rfpApi.getAll({ limit: 5 }), // For recent RFPs table display
          rfpApi.getAll({ limit: 1000 }), // Get all RFPs for accurate calculations
          vendorApi.getAll({ limit: 1000 }), // Get all vendors for accurate count
        ]);
        setRfps(rfpDataForTable.rfps); // Limited for table display
        setAllRfps(allRfpsData.rfps); // All RFPs for calculations
        setVendors(vendorData.vendors);
        // Use the actual count of RFPs fetched, not the total from API (which might be counting items)
        setTotalRfps(allRfpsData.rfps.length);
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-12 h-12 border-3 border-transparent border-r-blue-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <p className="text-sm text-gray-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate insights using all RFPs for accuracy
  const evaluatingRfps = allRfps.filter(r => r.status === RfpStatus.EVALUATING);
  const pendingResponses = allRfps.filter(r => r.status === RfpStatus.SENT);
  const highestBudgetRfp = allRfps.reduce((max, rfp) => 
    (!max || (rfp.budget && rfp.budget > (max.budget || 0))) ? rfp : max, 
    null as Rfp | null
  );

  const pendingVendorCount = allRfps.reduce((count, rfp) => {
    if (rfp.status === RfpStatus.SENT && rfp.rfpVendors) {
      const notResponded = rfp.rfpVendors.filter(rv => 
        rv.status !== 'responded' && rv.status !== 'declined'
      ).length;
      return count + notResponded;
    }
    return count;
  }, 0);

  const stats = [
    { 
      name: 'RFPs', 
      value: totalRfps,
      showChange: false,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      bgGradient: 'from-blue-50 to-blue-50/30',
      borderColor: 'border-blue-200/50',
    },
    { 
      name: 'Active Vendors', 
      value: vendors.filter(v => v.isActive).length || 0,
      showChange: false,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      bgGradient: 'from-blue-50/80 to-blue-50/20',
      borderColor: 'border-blue-200/40',
    },
    { 
      name: 'Pending Responses', 
      value: pendingResponses.length,
      change: pendingVendorCount > 0 ? `${pendingVendorCount} vendors` : null,
      showChange: pendingVendorCount > 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgGradient: 'from-blue-50/60 to-blue-50/10',
      borderColor: 'border-blue-200/30',
    },
  ];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = nowMidnight.getTime() - dateMidnight.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const formatCurrency = (amount: number, currency?: string) => {
    return `${currency || '$'} ${amount.toLocaleString()}`.trim();
  };

  const getStatusStyle = (status: RfpStatus) => {
    switch (status) {
      case RfpStatus.DRAFT: return 'bg-gray-100 text-gray-700';
      case RfpStatus.SENT: return 'bg-blue-100 text-blue-700';
      case RfpStatus.EVALUATING: return 'bg-blue-200 text-blue-800';
      case RfpStatus.AWARDED: return 'bg-blue-300 text-blue-900';
      case RfpStatus.CLOSED: return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-8 animate-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">Dashboard</h1>
          <p className="text-base text-gray-600">Welcome back! Here's what's happening with your RFPs.</p>
        </div>
        <Link
          to="/rfps/create"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New RFP
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, index) => {
          return (
            <div 
              key={stat.name}
              className={`group relative bg-gradient-to-br ${stat.bgGradient} rounded-xl border ${stat.borderColor} p-4 hover:border-blue-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden animate-in`}
              style={{ animationDelay: `${index * 75}ms` }}
            >
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(circle_at_1px_1px,rgb(37,99,235)_1px,transparent_0)] bg-[length:20px_20px]"></div>
              
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400"></div>
              
              <div className="relative">
                {/* Heading at top */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{stat.name}</p>
                  {stat.showChange && stat.change && (
                    <span className="text-xs text-gray-500 font-medium">{stat.change}</span>
                  )}
                </div>
                
                {/* Icon and number parallel */}
                <div className="flex items-center justify-between gap-3">
                  <div className="p-2 rounded-lg bg-white/60 backdrop-blur-sm border border-blue-200/30 text-blue-600 shadow-sm group-hover:bg-white/80 group-hover:shadow-md group-hover:scale-110 group-hover:border-blue-300 transition-all duration-300">
                    {stat.icon}
                  </div>
                  <p className="text-2xl font-bold text-gray-900 tabular-nums">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Insights - Takes 2 columns */}
        {(evaluatingRfps.length > 0 || pendingVendorCount > 0 || highestBudgetRfp) && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 rounded-xl shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">AI Insights</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Smart recommendations</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {evaluatingRfps.length > 0 && (
                <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-blue-50/50 border border-blue-100/50">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      {evaluatingRfps.length} RFP{evaluatingRfps.length > 1 ? 's are' : ' is'} under evaluation
                    </p>
                    <p className="text-xs text-gray-600">Review and make decisions on pending evaluations</p>
                  </div>
                </div>
              )}
              {pendingVendorCount > 0 && (
                <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-50/80 to-blue-50/30 border border-blue-100/40">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      {pendingVendorCount} vendor response{pendingVendorCount > 1 ? 's' : ''} pending
                    </p>
                    <p className="text-xs text-gray-600">Follow up with vendors who haven't responded</p>
                  </div>
                </div>
              )}
              {highestBudgetRfp && highestBudgetRfp.budget && (
                <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-50/60 to-blue-50/20 border border-blue-100/30">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      Highest budget: {highestBudgetRfp.title}
                    </p>
                    <p className="text-xs text-gray-600">{formatCurrency(highestBudgetRfp.budget, highestBudgetRfp.currency)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/rfps/create"
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 transition-all duration-200 group"
            >
              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-900">Create RFP</span>
            </Link>
            <Link
              to="/vendors"
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 transition-all duration-200 group"
            >
              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-900">Manage Vendors</span>
            </Link>
            <Link
              to="/rfps"
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 transition-all duration-200 group"
            >
              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-900">View All RFPs</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent RFPs Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Recent RFPs</h2>
              <p className="text-xs text-gray-500 mt-1">Latest request for proposals</p>
            </div>
            <Link 
              to="/rfps" 
              className="text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors inline-flex items-center gap-1.5"
            >
              View all
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
        
        {rfps.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-600 font-semibold mb-2">No RFPs yet</p>
            <p className="text-sm text-gray-500 mb-4">Get started by creating your first RFP</p>
            <Link 
              to="/rfps/create" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create RFP
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Open Since</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rfps.map((rfp) => (
                  <tr 
                    key={rfp.id} 
                    className="group hover:bg-gray-50/80 transition-colors duration-150 cursor-pointer"
                    onClick={() => window.location.href = `/rfps/${rfp.id}`}
                  >
                    <td className="px-6 py-4">
                      <Link
                        to={`/rfps/${rfp.id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors inline-flex items-center gap-2 group-hover:gap-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {rfp.title}
                        <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(rfp.createdAt)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-lg ${getStatusStyle(rfp.status)}`}>
                        {RfpStatusLabel[rfp.status] || rfp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right tabular-nums">
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
