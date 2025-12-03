import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { rfpApi, vendorApi, proposalApi } from '../services/api';
import { RfpStatus, RfpVendorStatus, ProposalStatus, RfpStatusLabel } from '../types';
import type { Rfp, Vendor, Proposal } from '../types';
import { format } from 'date-fns';

export default function RfpDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rfp, setRfp] = useState<Rfp | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRfp();
      fetchVendors();
      fetchProposals();
    }
  }, [id]);

  const fetchRfp = async () => {
    setLoading(true);
    try {
      const data = await rfpApi.getById(id!);
      setRfp(data);
      setSelectedVendors(data.rfpVendors?.map(rv => rv.vendorId) || []);
    } catch (error) {
      console.error('Failed to fetch RFP:', error);
      toast.error('Failed to load RFP');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const data = await vendorApi.getAll({ isActive: true });
      setVendors(data.vendors);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    }
  };

  const fetchProposals = async () => {
    try {
      const data = await proposalApi.getByRfp(id!);
      setProposals(data);
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
    }
  };

  const handleSendToVendors = async () => {
    if (selectedVendors.length === 0) {
      toast.error('Please select at least one vendor');
      return;
    }

    setSending(true);
    try {
      const result = await rfpApi.sendToVendors(id!, selectedVendors);
      toast.success(`RFP sent to ${result.sent} vendor(s)`);
      if (result.failed > 0) {
        toast.error(`Failed to send to ${result.failed} vendor(s)`);
      }
      fetchRfp();
      setShowVendorModal(false);
    } catch (error) {
      console.error('Failed to send RFP:', error);
      toast.error('Failed to send RFP');
    } finally {
      setSending(false);
    }
  };

  const toggleVendor = (vendorId: string) => {
    setSelectedVendors(prev =>
      prev.includes(vendorId)
        ? prev.filter(v => v !== vendorId)
        : [...prev, vendorId]
    );
  };

  if (loading || !rfp) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
              <div className="w-12 h-12 border-3 border-gray-200 border-t-primary-900 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-12 h-12 border-3 border-transparent border-r-primary-700 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <p className="text-sm text-gray-500 font-medium">Loading RFP...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate('/rfps')} 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to RFPs
          </button>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-3">{rfp.title}</h1>
          <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-lg uppercase tracking-wide ${
            rfp.status === RfpStatus.DRAFT ? 'bg-gray-100 text-gray-700' :
            rfp.status === RfpStatus.SENT ? 'bg-primary-100 text-primary-800' :
            rfp.status === RfpStatus.EVALUATING ? 'bg-primary-200 text-primary-900' :
            rfp.status === RfpStatus.AWARDED ? 'bg-primary-300 text-primary-950' :
            'bg-gray-100 text-gray-700'
          }`}>
            {RfpStatusLabel[rfp.status] || rfp.status}
          </span>
        </div>
        <div className="flex gap-3">
          {rfp.status === RfpStatus.EVALUATING && proposals.length > 0 && (
            <Link
              to={`/rfps/${id}/compare`}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 text-sm font-semibold text-gray-700 transition-all"
            >
              Compare Proposals
            </Link>
          )}
          <button
            onClick={() => setShowVendorModal(true)}
            disabled={rfp.status === RfpStatus.AWARDED}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-900 text-white rounded-xl hover:bg-primary-950 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-all shadow-lg hover:shadow-xl"
          >
            Send to Vendors
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              Description
            </h2>
            <p className="text-gray-600 leading-relaxed">{rfp.description}</p>
            {rfp.aiSummary && (
                <div className="mt-5 p-4 bg-gradient-to-r from-primary-50 to-primary-50/50 rounded-lg border border-primary-100">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                      <p className="text-xs font-semibold text-primary-900 uppercase tracking-wide mb-1">AI Summary</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{rfp.aiSummary}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Items ({rfp.items.length})
            </h2>
            <div className="space-y-4">
              {rfp.items.map((item, index) => (
                  <div key={index} className="group border border-gray-100 rounded-lg p-5 bg-gradient-to-br from-gray-50 to-white hover:border-primary-200 hover:shadow-md transition-all duration-200">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-900 font-semibold text-sm">
                          {index + 1}
                        </span>
                        <h3 className="font-semibold text-gray-900 text-lg">{item.name}</h3>
                      </div>
                      {item.description && (
                        <p className="text-gray-600 pl-11 leading-relaxed">{item.description}</p>
                      )}
                      {item.specifications && Object.keys(item.specifications).length > 0 && (
                        <div className="pl-11 pt-2">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Specifications</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(item.specifications).map(([key, value]) => (
                                <span key={key} className="inline-flex items-center text-sm bg-primary-50 text-primary-900 px-3 py-1.5 rounded-full border border-primary-100">
                                <span className="font-medium">{key}:</span>
                                <span className="ml-1">{String(value)}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <span className="inline-flex items-center px-4 py-2 bg-primary-50 text-primary-900 rounded-lg font-semibold border border-primary-100">
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Qty: {item.quantity}
                      </span>
                      {item.unit && (
                        <span className="text-xs text-gray-500">{item.unit}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vendors */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Vendors ({rfp.rfpVendors?.length || 0})
            </h2>
            {!rfp.rfpVendors || rfp.rfpVendors.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <p className="text-gray-500">No vendors added yet</p>
                <p className="text-sm text-gray-400 mt-1">Click "Send to Vendors" to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rfp.rfpVendors.map((rv) => (
                    <div key={rv.id} className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100 hover:border-primary-200 hover:shadow-sm transition-all duration-200">
                    <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-900 font-semibold">
                        {rv.vendor.companyName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{rv.vendor.companyName}</p>
                        <p className="text-sm text-gray-500">{rv.vendor.email}</p>
                      </div>
                    </div>
                      <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${
                        rv.status === RfpVendorStatus.RESPONDED ? 'bg-primary-200 text-primary-900' :
                        rv.status === RfpVendorStatus.SENT ? 'bg-primary-100 text-primary-800' :
                        'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                      {rv.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Proposals */}
          {proposals.length > 0 && (
            <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Proposals ({proposals.length})
              </h2>
              <div className="space-y-3">
                {proposals.map((proposal) => (
                    <div key={proposal.id} className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100 hover:border-primary-200 hover:shadow-sm transition-all duration-200">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-900 font-semibold">
                          {proposal.vendor.companyName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{proposal.vendor.companyName}</p>
                          <div className="flex flex-wrap gap-3 mt-2">
                            {proposal.totalPrice && (
                              <span className="inline-flex items-center text-sm bg-primary-50 text-primary-900 px-2.5 py-1 rounded-md">
                                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {proposal.currency || ''} {proposal.totalPrice.toLocaleString()}
                              </span>
                            )}
                            {proposal.deliveryDays && (
                              <span className="inline-flex items-center text-sm bg-primary-50 text-primary-900 px-2.5 py-1 rounded-md">
                                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {proposal.deliveryDays} days
                              </span>
                            )}
                            {proposal.aiScore && (
                              <span className="inline-flex items-center text-sm bg-primary-50 text-primary-900 px-2.5 py-1 rounded-md">
                                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                                Score: {proposal.aiScore}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                        <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${
                          proposal.status === ProposalStatus.SELECTED ? 'bg-primary-300 text-primary-950' :
                          proposal.status === ProposalStatus.EVALUATED ? 'bg-primary-200 text-primary-900' :
                          'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                        {proposal.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Details
            </h3>
            <dl className="space-y-4">
              {rfp.budget && (
                  <div className="p-3 bg-gradient-to-r from-primary-50 to-primary-50/50 rounded-lg border border-primary-100">
                    <dt className="text-xs font-medium text-primary-900 uppercase tracking-wide mb-1">Budget</dt>
                    <dd className="font-bold text-primary-950 text-xl">{rfp.currency || ''} {rfp.budget.toLocaleString()}</dd>
                </div>
              )}
              {rfp.deliveryDays && (
                  <div className="p-3 bg-gradient-to-r from-primary-50 to-primary-50/50 rounded-lg border border-primary-100">
                    <dt className="text-xs font-medium text-primary-900 uppercase tracking-wide mb-1">Delivery Timeline</dt>
                    <dd className="font-semibold text-primary-950">Within {rfp.deliveryDays} days</dd>
                </div>
              )}
              {rfp.paymentTerms && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Payment Terms</dt>
                  <dd className="font-medium text-gray-800">{rfp.paymentTerms}</dd>
                </div>
              )}
              {rfp.warrantyTerms && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Warranty</dt>
                  <dd className="font-medium text-gray-800">{rfp.warrantyTerms}</dd>
                </div>
              )}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Created</dt>
                <dd className="font-medium text-gray-800">{format(new Date(rfp.createdAt), 'MMM d, yyyy')}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Vendor Selection Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Select Vendors</h2>
              <button
                onClick={() => setShowVendorModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {vendors.map((vendor) => (
                <label
                  key={vendor.id}
                  className="flex items-center p-3 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100"
                >
                  <input
                    type="checkbox"
                    checked={selectedVendors.includes(vendor.id)}
                    onChange={() => toggleVendor(vendor.id)}
                    className="mr-3"
                  />
                  <div>
                    <p className="font-medium">{vendor.companyName}</p>
                    <p className="text-sm text-gray-500">{vendor.email}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowVendorModal(false)}
                className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700 text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSendToVendors}
                disabled={selectedVendors.length === 0 || sending}
                  className="px-5 py-2.5 bg-primary-900 text-white rounded-xl hover:bg-primary-950 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-all shadow-lg hover:shadow-xl"
              >
                {sending ? 'Sending...' : `Send RFP (${selectedVendors.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
