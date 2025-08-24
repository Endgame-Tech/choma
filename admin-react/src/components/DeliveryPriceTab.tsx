import React, { useState, useEffect } from 'react';
import { DeliveryPrice } from '../types';
import { deliveryPricesApi } from '../services/api';
import { PencilIcon, TrashIcon, PlusIcon, MapPinIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import ResponsiveTable from './ResponsiveTable';
import ConfirmationModal from './ConfirmationModal';

const DeliveryPriceTab: React.FC = () => {
    const [prices, setPrices] = useState<DeliveryPrice[]>([]);
    const [editing, setEditing] = useState<string | null>(null);
    const [form, setForm] = useState<{ location: string; price: string }>({ location: '', price: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);

    // Confirmation modal state
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'danger' as 'danger' | 'warning' | 'info',
        onConfirm: () => { },
        loading: false
    });

    const loadPrices = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await deliveryPricesApi.getDeliveryPrices();
            setPrices(data);
        } catch (err) {
            setError('Failed to fetch delivery prices.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPrices();
    }, []);

    const handleAdd = async () => {
        if (!form.location || !form.price) return;
        setLoading(true);
        setError(null);
        try {
            const newPrice = await deliveryPricesApi.createDeliveryPrice({ location: form.location, price: Number(form.price) });
            setPrices([...prices, newPrice]);
            setForm({ location: '', price: '' });
            setShowAddForm(false);
        } catch (err) {
            setError('Failed to add delivery price.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (price: DeliveryPrice) => {
        setEditing(price._id);
        setForm({ location: price.location, price: price.price.toString() });
    };

    const handleUpdate = async () => {
        if (!form.price || editing === null) return;
        setLoading(true);
        setError(null);
        try {
            const updated = await deliveryPricesApi.updateDeliveryPrice(editing, { price: Number(form.price) });
            setPrices(prices.map((p) => (p._id === editing ? updated : p)));
            cancelEdit();
        } catch (err) {
            setError('Failed to update delivery price.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const cancelEdit = () => {
        setEditing(null);
        setForm({ location: '', price: '' });
    };

    const cancelAdd = () => {
        setShowAddForm(false);
        setForm({ location: '', price: '' });
    };

    const confirmDelete = (price: DeliveryPrice) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Delivery Zone',
            message: `Are you sure you want to delete the delivery zone for "${price.location}"? This action cannot be undone.`,
            type: 'danger',
            onConfirm: () => handleDelete(price._id),
            loading: false
        });
    };

    const handleDelete = async (id: string) => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        setError(null);
        try {
            await deliveryPricesApi.deleteDeliveryPrice(id);
            setPrices(prices.filter((p) => p._id !== id));
            setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
        } catch (err) {
            setError('Failed to delete delivery price.');
            console.error(err);
            setConfirmModal(prev => ({ ...prev, loading: false }));
        }
    };

    return (
        <div className="space-y-6">
            {/* Header with Stats */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <MapPinIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">Delivery Zones</h2>
                        <p className="text-gray-600 dark:text-neutral-400">Manage delivery pricing across different locations</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className="text-sm text-gray-500 dark:text-neutral-400">Total Zones</div>
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{prices.length}</div>
                    </div>
                    {!showAddForm && !editing && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
                        >
                            <PlusIcon className="h-5 w-5" />
                            Add New Zone
                        </button>
                    )}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
                </div>
            )}

            {/* Add/Edit Form */}
            {(showAddForm || editing) && (
                <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                            {editing ? (
                                <PencilIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            ) : (
                                <PlusIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            )}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
                            {editing ? 'Edit Delivery Zone' : 'Add New Delivery Zone'}
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                                Location *
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Victoria Island"
                                value={form.location}
                                onChange={(e) => setForm({ ...form, location: e.target.value })}
                                disabled={!!editing}
                                className="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 dark:text-neutral-100 placeholder-gray-500 dark:placeholder-neutral-400 disabled:bg-gray-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                                Delivery Price (₦) *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <CurrencyDollarIcon className="h-5 w-5 text-gray-400 dark:text-neutral-500" />
                                </div>
                                <input
                                    type="number"
                                    placeholder="1000"
                                    value={form.price}
                                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                                    className="w-full pl-10 pr-3 py-2 bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 dark:text-neutral-100 placeholder-gray-500 dark:placeholder-neutral-400"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={editing ? cancelEdit : cancelAdd}
                            className="px-4 py-2 border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={editing ? handleUpdate : handleAdd}
                            disabled={loading || !form.location || !form.price}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 dark:disabled:bg-neutral-600 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                        >
                            {editing ? (
                                <>
                                    <PencilIcon className="h-4 w-4" />
                                    {loading ? 'Updating...' : 'Update Zone'}
                                </>
                            ) : (
                                <>
                                    <PlusIcon className="h-4 w-4" />
                                    {loading ? 'Adding...' : 'Add Zone'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Delivery Zones Table */}
            <ResponsiveTable>
                <thead>
                    <tr className="bg-orange-50 dark:bg-orange-900/20">
                        <th className="px-6 py-3 text-left text-xs font-medium text-orange-800 dark:text-orange-200 uppercase tracking-wider">
                            Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-orange-800 dark:text-orange-200 uppercase tracking-wider">
                            Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-orange-800 dark:text-orange-200 uppercase tracking-wider">
                            Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-orange-800 dark:text-orange-200 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                    {loading && prices.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-neutral-400">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                                    <p>Loading delivery zones...</p>
                                </div>
                            </td>
                        </tr>
                    ) : prices.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-neutral-400">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="p-3 bg-gray-100 dark:bg-neutral-800 rounded-full">
                                        <MapPinIcon className="h-8 w-8 text-gray-400 dark:text-neutral-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-neutral-100">No delivery zones configured</p>
                                        <p className="text-sm">Add your first delivery zone to start managing pricing</p>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        prices.map((price) => (
                            <tr key={price._id} className="hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                            <MapPinIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-neutral-100">{price.location}</div>
                                            <div className="text-xs text-gray-500 dark:text-neutral-400">Delivery Zone</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                                        ₦{price.price.toLocaleString()}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${price.isActive
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                        }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${price.isActive ? 'bg-green-400' : 'bg-red-400'
                                            }`}></div>
                                        {price.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleEdit(price)}
                                            className="inline-flex items-center p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                                            title="Edit delivery zone"
                                            >
                                            <PencilIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => confirmDelete(price)}
                                        className="inline-flex items-center p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                        title="Delete delivery zone"
                                        >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </td>
                            </tr>
                ))
                    )}
            </tbody>
        </ResponsiveTable>

            {/* Confirmation Modal */}
    <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText="Delete Zone"
        cancelText="Cancel"
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        loading={confirmModal.loading}
    />
        </div>
    );
}

export default DeliveryPriceTab;