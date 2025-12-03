import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { rfpApi } from '../services/api';
import { RfpStatus, RfpStatusLabel } from '../types';
import type { Rfp } from '../types';
import { format } from 'date-fns';

export default function RfpList() {
  const [rfps, setRfps] = useState<Rfp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchRfps();
  }, [search, statusFilter]);

  const fetchRfps = async () => {
    setLoading(true);
    try {
      const data = await rfpApi.getAll({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setRfps(data.rfps);
    } catch (error) {
      console.error('Failed to fetch RFPs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: RfpStatus) => {
    switch (status) {
      case RfpStatus.DRAFT: return 'bg-gray-100 text-gray-700';
      case RfpStatus.SENT: return 'bg-primary-100 text-primary-800';
      case RfpStatus.EVALUATING: return 'bg-primary-200 text-primary-900';
      case RfpStatus.AWARDED: return 'bg-primary-300 text-primary-950';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">RFPs</h1>
          <p className="text-base text-gray-600">Manage and track all your request for proposals</p>
        </div>
        <Link
          to="/rfps/create"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary-900 text-white text-sm font-semibold rounded-xl hover:bg-primary-950 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New RFP
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        <input
          type="text"
          placeholder="Search RFPs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-1 focus:ring-primary-900 focus:border-primary-900 text-sm text-gray-900 placeholder-gray-400 bg-white transition-all hover:border-gray-400"
        />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-1 focus:ring-primary-900 focus:border-primary-900 text-sm text-gray-900 bg-white transition-all hover:border-gray-400 cursor-pointer font-medium"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="evaluating">Evaluating</option>
          <option value="deal_sold">Deal Sold</option>
        </select>
      </div>

      {/* RFP List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
                <div className="w-12 h-12 border-3 border-gray-200 border-t-primary-900 rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-12 h-12 border-3 border-transparent border-r-primary-700 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <p className="text-sm text-gray-500 font-medium">Loading RFPs...</p>
          </div>
        </div>
      ) : rfps.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm py-20 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-600 font-semibold mb-2">No RFPs found</p>
          <p className="text-sm text-gray-500 mb-4">Get started by creating your first RFP</p>
          <Link 
            to="/rfps/create" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-900 text-white text-sm font-semibold rounded-lg hover:bg-primary-950 transition-colors"
          >
            Create RFP
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Budget</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Vendors</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Created</th>
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
                          className="text-sm font-semibold text-gray-900 hover:text-primary-900 transition-colors inline-flex items-center gap-2 group-hover:gap-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                      {rfp.title}
                        <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                  </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right tabular-nums">
                      {rfp.budget ? `${rfp.currency || ''} ${rfp.budget.toLocaleString()}` : '-'}
                  </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{rfp.items?.length || 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{rfp.rfpVendors?.length || 0}</td>
                  <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-lg ${getStatusStyle(rfp.status)}`}>
                        {RfpStatusLabel[rfp.status] || rfp.status}
                    </span>
                  </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                    {format(new Date(rfp.createdAt), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
