import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { rfpApi } from '../services/api';
import { RfpStatus } from '../types';
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
      case RfpStatus.DRAFT: return 'bg-gray-50 text-gray-600 border-gray-300';
      case RfpStatus.SENT: return 'bg-amber-50 text-amber-700 border-amber-400';
      case RfpStatus.EVALUATING: return 'bg-blue-50 text-blue-700 border-blue-400';
      case RfpStatus.AWARDED: return 'bg-emerald-50 text-emerald-700 border-emerald-400';
      case RfpStatus.CLOSED: return 'bg-purple-50 text-purple-700 border-purple-400';
      default: return 'bg-gray-50 text-gray-600 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">RFPs</h1>
        <Link
          to="/rfps/create"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          + Create RFP
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search RFPs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="evaluating">Evaluating</option>
          <option value="awarded">Awarded</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* RFP List */}
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : rfps.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No RFPs found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendors</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rfps.map((rfp) => (
                <tr key={rfp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link to={`/rfps/${rfp.id}`} className="text-blue-600 hover:underline font-medium">
                      {rfp.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {rfp.budget ? `$${rfp.budget.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{rfp.items?.length || 0}</td>
                  <td className="px-6 py-4 text-gray-600">{rfp.rfpVendors?.length || 0}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 uppercase tracking-wide ${getStatusStyle(rfp.status)}`}>
                      {rfp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
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
