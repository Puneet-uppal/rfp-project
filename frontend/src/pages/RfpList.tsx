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
      case RfpStatus.DRAFT: return 'bg-violet-100 text-violet-700';
      case RfpStatus.SENT: return 'bg-violet-200 text-violet-800';
      case RfpStatus.EVALUATING: return 'bg-violet-300 text-violet-950';
      case RfpStatus.AWARDED: return 'bg-violet-950 text-white';
      case RfpStatus.CLOSED: return 'bg-violet-800 text-white';
      default: return 'bg-violet-100 text-violet-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold text-violet-950 tracking-tight mb-1.5">RFPs</h1>
          <p className="text-sm text-violet-600">Manage your request for proposals</p>
        </div>
        <Link
          to="/rfps/create"
          className="bg-violet-950 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-900 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
        >
          Create RFP
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search RFPs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-violet-950 placeholder-violet-400 text-sm transition-all bg-white hover:border-violet-300"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-violet-950 text-sm bg-white transition-all hover:border-violet-300 cursor-pointer"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="evaluating">Evaluating</option>
          <option value="awarded">Deal Sold</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* RFP List */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-violet-200 border-t-violet-950"></div>
        </div>
      ) : rfps.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-violet-100">
          <p className="text-violet-600">No RFPs found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-violet-100 overflow-hidden shadow-sm">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-violet-100 bg-violet-50/30">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider">Budget</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider">Vendors</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider">Created</th>
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
                    <Link to={`/rfps/${rfp.id}`} className="text-sm font-medium text-violet-950 hover:text-violet-700 transition-colors inline-flex items-center gap-1.5 group-hover:gap-2">
                      {rfp.title}
                      <svg className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-violet-950 font-semibold tabular-nums">
                    {rfp.budget ? `${rfp.currency || ''} ${rfp.budget.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-violet-600">{rfp.items?.length || 0}</td>
                  <td className="px-6 py-4 text-sm text-violet-600">{rfp.rfpVendors?.length || 0}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-200 ${getStatusStyle(rfp.status)}`}>
                      {RfpStatusLabel[rfp.status] || rfp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-violet-600">
                    {format(new Date(rfp.createdAt), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
