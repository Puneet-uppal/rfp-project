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
      icon: '📋',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-400',
      textColor: 'text-blue-700',
    },
    { 
      name: 'Active Vendors', 
      value: vendors.filter(v => v.isActive).length,
      icon: '🏢',
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-400',
      textColor: 'text-emerald-700',
    },
    { 
      name: 'Pending Responses', 
      value: rfps.filter(r => r.status === RfpStatus.SENT).length,
      icon: '⏳',
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-400',
      textColor: 'text-amber-700',
    },
    { 
      name: 'Under Evaluation', 
      value: rfps.filter(r => r.status === RfpStatus.EVALUATING).length,
      icon: '🔍',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-400',
      textColor: 'text-purple-700',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link
          to="/rfps/create"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          + Create RFP
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div 
            key={stat.name} 
            className={`${stat.bgColor} p-5 rounded-xl border-2 ${stat.borderColor} shadow-sm hover:shadow-md transition-all duration-200 group`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${stat.textColor} opacity-80`}>{stat.name}</p>
                <p className={`text-3xl font-bold ${stat.textColor} mt-1`}>{stat.value}</p>
              </div>
              <div className={`text-3xl opacity-70 group-hover:scale-110 transition-transform duration-200`}>
                {stat.icon}
              </div>
            </div>
            <div className={`mt-3 h-1 rounded-full bg-gradient-to-r ${stat.color} opacity-60`}></div>
          </div>
        ))}
      </div>

      {/* Recent RFPs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Recent RFPs</h2>
        </div>
        {rfps.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No RFPs yet. <Link to="/rfps/create" className="text-blue-600 hover:underline">Create your first RFP</Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {rfps.map((rfp) => (
              <Link
                key={rfp.id}
                to={`/rfps/${rfp.id}`}
                className="block p-4 hover:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{rfp.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{rfp.description.substring(0, 100)}...</p>
                  </div>
                  <span className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 uppercase tracking-wide ${
                    rfp.status === RfpStatus.DRAFT ? 'bg-gray-50 text-gray-600 border-gray-300' :
                    rfp.status === RfpStatus.SENT ? 'bg-amber-50 text-amber-700 border-amber-400' :
                    rfp.status === RfpStatus.EVALUATING ? 'bg-blue-50 text-blue-700 border-blue-400' :
                    rfp.status === RfpStatus.AWARDED ? 'bg-emerald-50 text-emerald-700 border-emerald-400' :
                    rfp.status === RfpStatus.CLOSED ? 'bg-purple-50 text-purple-700 border-purple-400' :
                    'bg-gray-50 text-gray-600 border-gray-300'
                  }`}>
                    {RfpStatusLabel[rfp.status] || rfp.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
