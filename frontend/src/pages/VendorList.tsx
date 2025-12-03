import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { vendorApi } from '../services/api';
import type { Vendor } from '../types';

export default function VendorList() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; vendorId: string | null; vendorName: string }>({
    show: false,
    vendorId: null,
    vendorName: '',
  });
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    category: '',
    notes: '',
  });

  useEffect(() => {
    fetchVendors();
  }, [search]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const data = await vendorApi.getAll({ search: search || undefined });
      setVendors(data.vendors);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (vendor?: Vendor) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormData({
        companyName: vendor.companyName,
        contactPerson: vendor.contactPerson,
        email: vendor.email,
        phone: vendor.phone || '',
        address: vendor.address || '',
        category: vendor.category || '',
        notes: vendor.notes || '',
      });
    } else {
      setEditingVendor(null);
      setFormData({
        companyName: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        category: '',
        notes: '',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVendor) {
        await vendorApi.update(editingVendor.id, formData);
        toast.success('Vendor updated');
      } else {
        await vendorApi.create(formData);
        toast.success('Vendor created');
      }
      setShowModal(false);
      fetchVendors();
    } catch (error) {
      console.error('Failed to save vendor:', error);
      toast.error('Failed to save vendor');
    }
  };

  const handleDeleteClick = (vendor: Vendor) => {
    setDeleteConfirm({ show: true, vendorId: vendor.id, vendorName: vendor.companyName });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.vendorId) return;
    try {
      await vendorApi.delete(deleteConfirm.vendorId);
      toast.success('Vendor deleted');
      setDeleteConfirm({ show: false, vendorId: null, vendorName: '' });
      fetchVendors();
    } catch (error) {
      console.error('Failed to delete vendor:', error);
      toast.error('Failed to delete vendor');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-violet-950 tracking-tight">Vendors</h1>
          <p className="text-sm text-violet-600 mt-1">Manage your vendor contacts</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-violet-950 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-900 transition-colors duration-150 shadow-sm hover:shadow"
        >
          Add Vendor
        </button>
      </div>

      <input
        type="text"
        placeholder="Search vendors..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md px-4 py-2.5 border border-violet-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-violet-950 placeholder-violet-400 text-sm transition-all"
      />

      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-violet-200 border-t-violet-950"></div>
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-violet-100">
          <p className="text-violet-600">No vendors found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-violet-100 overflow-hidden shadow-sm">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-violet-100">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-violet-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-50">
              {vendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-violet-50/50 transition-colors duration-150">
                  <td className="px-6 py-4 font-medium text-violet-950">{vendor.companyName}</td>
                  <td className="px-6 py-4 text-sm text-violet-600">{vendor.contactPerson}</td>
                  <td className="px-6 py-4 text-sm text-violet-600">{vendor.email}</td>
                  <td className="px-6 py-4 text-sm text-violet-600">{vendor.category || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(vendor)}
                        className="p-2 text-violet-700 hover:text-violet-950 hover:bg-violet-50 rounded-md transition-all duration-150"
                        title="Edit vendor"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(vendor)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-all duration-150"
                        title="Delete vendor"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg p-8 shadow-xl">
            <h2 className="text-xl font-semibold text-violet-950 mb-6">
              {editingVendor ? 'Edit Vendor' : 'Add Vendor'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-violet-950 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-violet-200 rounded-lg text-violet-950 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-violet-950 mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-4 py-2.5 border border-violet-200 rounded-lg text-violet-950 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-violet-950 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-violet-300 rounded-md text-violet-900 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-violet-950 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-violet-200 rounded-lg text-violet-950 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-violet-950 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., IT Equipment"
                    className="w-full px-3 py-2 border border-violet-300 rounded-md text-violet-900 placeholder-violet-400 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-violet-950 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-violet-300 rounded-md text-violet-900 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-violet-950 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-violet-300 rounded-md text-violet-900 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-violet-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border border-violet-200 rounded-lg hover:bg-violet-50 text-violet-700 text-sm font-medium transition-all duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-violet-950 text-white px-5 py-2.5 rounded-lg hover:bg-violet-900 text-sm font-medium transition-all duration-150 shadow-sm hover:shadow"
                >
                  {editingVendor ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md p-8 shadow-xl">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-violet-950 text-center mb-2">Delete Vendor</h3>
            <p className="text-violet-950 text-center mb-6">
              Are you sure you want to delete <span className="font-semibold">{deleteConfirm.vendorName}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm({ show: false, vendorId: null, vendorName: '' })}
                className="flex-1 px-4 py-2.5 border border-violet-300 rounded-lg font-medium text-violet-950 hover:bg-violet-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
