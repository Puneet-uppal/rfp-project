import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { comparisonApi, proposalApi, rfpApi } from '../services/api';
import type { ComparisonResult, Rfp } from '../types';

export default function Comparison() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rfp, setRfp] = useState<Rfp | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [dealConfirm, setDealConfirm] = useState<{ show: boolean; proposalId: string | null; vendorName: string }>({
    show: false,
    proposalId: null,
    vendorName: '',
  });

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rfpData, comparisonData] = await Promise.all([
        rfpApi.getById(id!),
        comparisonApi.compare(id!),
      ]);
      setRfp(rfpData);
      setComparison(comparisonData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load comparison');
    } finally {
      setLoading(false);
    }
  };

  const handleGetRecommendation = async () => {
    setLoadingRecommendation(true);
    try {
      const result = await comparisonApi.getFullComparison(id!);
      setComparison(result);
      toast.success('AI recommendation generated');
    } catch (error) {
      console.error('Failed to get recommendation:', error);
      toast.error('Failed to generate recommendation');
    } finally {
      setLoadingRecommendation(false);
    }
  };

  const handleSelectDealClick = (proposalId: string, vendorName: string) => {
    setDealConfirm({ show: true, proposalId, vendorName });
  };

  const handleSelectDealConfirm = async () => {
    if (!dealConfirm.proposalId) return;
    try {
      await proposalApi.selectWinner(dealConfirm.proposalId);
      toast.success('Deal confirmed successfully');
      setDealConfirm({ show: false, proposalId: null, vendorName: '' });
      navigate(`/rfps/${id}`);
    } catch (error) {
      console.error('Failed to confirm deal:', error);
      toast.error('Failed to confirm deal');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading comparison data...</p>
      </div>
    );
  }

  if (!rfp || !comparison) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <p className="text-red-500 text-lg">Failed to load data</p>
        <p className="text-gray-500 mt-2">RFP: {rfp ? 'Loaded' : 'Not loaded'}</p>
        <p className="text-gray-500">Comparison: {comparison ? 'Loaded' : 'Not loaded'}</p>
        <button 
          onClick={() => navigate(`/rfps/${id}`)} 
          className="mt-4 text-blue-600 hover:underline"
        >
          ← Back to RFP
        </button>
      </div>
    );
  }

  if (!comparison.proposals || comparison.proposals.length === 0) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate(`/rfps/${id}`)} className="text-blue-600 hover:underline">
          ← Back to RFP
        </button>
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 text-lg">No proposals to compare</p>
          <p className="text-gray-400 text-sm mt-2">Wait for vendors to submit their proposals</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate(`/rfps/${id}`)} className="text-blue-600 hover:underline mb-2">
            ← Back to RFP
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Proposal Comparison</h1>
          <p className="text-gray-600">{rfp.title}</p>
        </div>
        <button
          onClick={handleGetRecommendation}
          disabled={loadingRecommendation}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loadingRecommendation ? 'Analyzing...' : 'Get AI Recommendation'}
        </button>
      </div>

      {/* AI Recommendation */}
      {comparison.aiRecommendation && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-green-800 mb-2">
            🏆 AI Recommendation: {comparison.aiRecommendation.recommendedVendor}
          </h2>
          <p className="text-green-700 mb-4">{comparison.aiRecommendation.reasoning}</p>
          <div className="bg-white p-4 rounded-md">
            <p className="text-sm text-gray-600">{comparison.aiRecommendation.comparisonSummary}</p>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {comparison.proposals.map((proposal) => {
              const isRecommended = comparison.aiRecommendation?.recommendedVendor === proposal.vendorName;
              return (
                <tr key={proposal.id} className={isRecommended ? 'bg-green-50' : ''}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {isRecommended && <span className="mr-2">🏆</span>}
                      <div>
                        <p className="font-medium text-gray-900">{proposal.vendorName}</p>
                        {isRecommended && <span className="text-xs text-green-600">Recommended</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium">{proposal.totalPrice ? `${proposal.currency || comparison.rfp.currency || ''} ${Number(proposal.totalPrice).toLocaleString()}` : '-'}</p>
                    {comparison.rfp.budget && proposal.totalPrice && (
                      <p className={`text-xs ${Number(proposal.totalPrice) <= Number(comparison.rfp.budget) ? 'text-green-600' : 'text-red-600'}`}>
                        {((Number(proposal.totalPrice) / Number(comparison.rfp.budget)) * 100).toFixed(0)}% of budget
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium">{proposal.deliveryDays ? `${proposal.deliveryDays} days` : '-'}</p>
                    {comparison.rfp.deliveryDays && proposal.deliveryDays && (
                      <p className={`text-xs ${Number(proposal.deliveryDays) <= Number(comparison.rfp.deliveryDays) ? 'text-green-600' : 'text-red-600'}`}>
                        {Number(proposal.deliveryDays) <= Number(comparison.rfp.deliveryDays) ? 'Meets requirement' : 'Exceeds'}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {proposal.score ? (
                      <span className={`font-bold text-lg ${
                        Number(proposal.score) >= 80 ? 'text-green-600' :
                        Number(proposal.score) >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {Number(proposal.score).toFixed(0)}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleSelectDealClick(proposal.id, proposal.vendorName)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Select Deal
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {comparison.proposals.map((proposal) => (
          <div key={proposal.id} className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{proposal.vendorName}</h3>
            
            {proposal.strengths && proposal.strengths.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-green-600 mb-2">✓ Strengths</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {proposal.strengths.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {proposal.weaknesses && proposal.weaknesses.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-600 mb-2">✗ Weaknesses</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {proposal.weaknesses.map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
              </div>
            )}

            {proposal.scoreBreakdown && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Score Breakdown</h4>
                <div className="grid grid-cols-5 gap-2 text-xs text-center">
                  <div>
                    <p className="font-medium">{proposal.scoreBreakdown.priceScore || 0}</p>
                    <p className="text-gray-500">Price</p>
                  </div>
                  <div>
                    <p className="font-medium">{proposal.scoreBreakdown.deliveryScore || 0}</p>
                    <p className="text-gray-500">Delivery</p>
                  </div>
                  <div>
                    <p className="font-medium">{proposal.scoreBreakdown.termsScore || 0}</p>
                    <p className="text-gray-500">Terms</p>
                  </div>
                  <div>
                    <p className="font-medium">{proposal.scoreBreakdown.completenessScore || 0}</p>
                    <p className="text-gray-500">Complete</p>
                  </div>
                  <div>
                    <p className="font-medium">{proposal.scoreBreakdown.complianceScore || 0}</p>
                    <p className="text-gray-500">Comply</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Deal Confirmation Modal */}
      {dealConfirm.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Confirm Deal</h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to select <span className="font-semibold">{dealConfirm.vendorName}</span> for this deal? This will mark them as the selected vendor.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDealConfirm({ show: false, proposalId: null, vendorName: '' })}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSelectDealConfirm}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Confirm Deal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
