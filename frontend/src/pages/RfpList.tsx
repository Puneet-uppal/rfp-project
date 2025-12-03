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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-violet-950 tracking-tight">RFPs</h1>
          <p className="text-sm text-violet-600 mt-1">Manage your request for proposals</p>
        </div>
        <Link
          to="/rfps/create"
          className="bg-violet-950 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-900 transition-colors duration-150 shadow-sm hover:shadow"
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
          className="flex-1 px-4 py-2.5 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-violet-950 placeholder-violet-400 text-sm transition-all"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-violet-950 text-sm bg-white transition-all"
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
        <div className="bg-white rounded-lg border border-violet-100 overflow-hidden shadow-sm">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-violet-100">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider">Budget</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider">Vendors</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-50">
              {rfps.map((rfp) => (
                <tr key={rfp.id} className="hover:bg-violet-50/50 transition-colors duration-150">
                  <td className="px-6 py-4">
                    <Link to={`/rfps/${rfp.id}`} className="text-sm font-medium text-violet-950 hover:text-violet-700 transition-colors">
                      {rfp.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-violet-950">
                    {rfp.budget ? `${rfp.currency || ''} ${rfp.budget.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-violet-600">{rfp.items?.length || 0}</td>
                  <td className="px-6 py-4 text-sm text-violet-600">{rfp.rfpVendors?.length || 0}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-md ${getStatusStyle(rfp.status)}`}>
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
