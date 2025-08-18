import React, { useState, useEffect } from 'react'
import { notificationsApi } from '../services/api'
import {
    Bell,
    AlertTriangle,
    CheckCircle,
    FileText,
    ChefHat,
    Package
} from 'lucide-react'

// Notification type interface
interface Notification {
    _id: string
    title: string
    message: string
    type: string
    priority: 'low' | 'medium' | 'high'
    isRead: boolean
    createdAt: string
    data?: any
}

const Notifications: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            setLoading(true)
            const data = await notificationsApi.getNotifications()
            // Ensure data is always an array
            setNotifications(Array.isArray(data) ? data : [])
            setError(null)
        } catch (err) {
            console.error('Failed to fetch notifications:', err)
            setError('Failed to load notifications. Please try again.')
            setNotifications([]) // Set empty array on error
        } finally {
            setLoading(false)
        }
    }

    // Mark notification as read
    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await notificationsApi.markAsRead(notificationId)
            setNotifications(prev =>
                prev.map(notification =>
                    notification._id === notificationId
                        ? { ...notification, isRead: true }
                        : notification
                )
            )
        } catch (err) {
            console.error('Failed to mark notification as read:', err)
        }
    }

    // Mark all as read
    const handleMarkAllAsRead = async () => {
        try {
            // Ensure notifications is an array before filtering
            if (!Array.isArray(notifications)) {
                console.error('Notifications is not an array:', notifications)
                return
            }

            const unreadNotifications = notifications.filter(n => !n.isRead)

            // Mark all unread notifications as read
            await Promise.all(
                unreadNotifications.map(notification =>
                    notificationsApi.markAsRead(notification._id)
                )
            )

            setNotifications(prev =>
                prev.map(notification => ({ ...notification, isRead: true }))
            )
        } catch (err) {
            console.error('Failed to mark all notifications as read:', err)
        }
    }

    useEffect(() => {
        fetchNotifications()
    }, [])

    // Filter notifications
    const filteredNotifications = Array.isArray(notifications) ? notifications.filter(notification => {
        if (filter === 'unread') return !notification.isRead
        if (filter === 'read') return notification.isRead
        return true
    }) : []

    // Get notification icon and color based on type
    const getNotificationStyle = (type: string) => {
        let IconComponent = Bell
        let bgColor = 'bg-blue-50 dark:bg-blue-900'
        let borderColor = 'border-blue-200 dark:border-blue-700'
        let iconBg = 'bg-blue-100 dark:bg-blue-800'
        let iconColor = 'text-blue-600 dark:text-blue-400'

        // Type-based icons
        switch (type) {
            case 'account_suspended':
                IconComponent = AlertTriangle
                bgColor = 'bg-red-50 dark:bg-red-900'
                borderColor = 'border-red-200 dark:border-red-700'
                iconBg = 'bg-red-100 dark:bg-red-800'
                iconColor = 'text-red-600 dark:text-red-400'
                break
            case 'account_unsuspended':
            case 'account_reactivated':
            case 'account_approved':
                IconComponent = CheckCircle
                bgColor = 'bg-green-50 dark:bg-green-900'
                borderColor = 'border-green-200 dark:border-green-700'
                iconBg = 'bg-green-100 dark:bg-green-800'
                iconColor = 'text-green-600 dark:text-green-400'
                break
            case 'account_deactivated':
            case 'account_rejected':
                IconComponent = FileText
                bgColor = 'bg-gray-50 dark:bg-gray-800'
                borderColor = 'border-gray-200 dark:border-gray-700'
                iconBg = 'bg-gray-100 dark:bg-gray-700'
                iconColor = 'text-gray-600 dark:text-gray-400'
                break
            case 'chef_assigned':
                IconComponent = ChefHat
                bgColor = 'bg-orange-50 dark:bg-orange-900'
                borderColor = 'border-orange-200 dark:border-orange-700'
                iconBg = 'bg-orange-100 dark:bg-orange-800'
                iconColor = 'text-orange-600 dark:text-orange-400'
                break
            case 'order_update':
                IconComponent = Package
                bgColor = 'bg-purple-50 dark:bg-purple-900'
                borderColor = 'border-purple-200 dark:border-purple-700'
                iconBg = 'bg-purple-100 dark:bg-purple-800'
                iconColor = 'text-purple-600 dark:text-purple-400'
                break
        }

        return { IconComponent, bgColor, borderColor, iconBg, iconColor }
    }

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

        if (diffInHours < 1) return 'Just now'
        if (diffInHours < 24) return `${diffInHours}h ago`
        if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
        return date.toLocaleDateString()
    }

    const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.isRead).length : 0

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
                    <div className="flex">
                        <div className="text-red-400 text-xl mr-3">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h3 className="text-red-800 dark:text-red-100 font-medium">Error Loading Notifications</h3>
                            <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
                            <button
                                onClick={fetchNotifications}
                                className="mt-2 text-red-600 dark:text-red-300 hover:text-red-800 dark:hover:text-red-100 text-sm underline"
                            >
                                Try again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllAsRead}
                            className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors"
                        >
                            Mark all as read
                        </button>
                    )}
                </div>

                {/* Filter tabs */}
                <div className="mt-4 border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8">
                        {[
                            { key: 'all', label: 'All', count: Array.isArray(notifications) ? notifications.length : 0 },
                            { key: 'unread', label: 'Unread', count: unreadCount },
                            { key: 'read', label: 'Read', count: Array.isArray(notifications) ? notifications.length - unreadCount : 0 }
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key as 'all' | 'unread' | 'read')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${filter === tab.key
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${filter === tab.key
                                        ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                        }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Notifications list */}
            <div className="space-y-4">
                {filteredNotifications.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="flex justify-center mb-4">
                            <Bell size={48} className="text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            {filter === 'unread' ? 'No unread notifications' :
                                filter === 'read' ? 'No read notifications' :
                                    'No notifications yet'}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            {filter === 'all'
                                ? 'When you receive notifications, they\'ll appear here.'
                                : `Switch to other tabs to see ${filter === 'unread' ? 'read' : 'unread'} notifications.`
                            }
                        </p>
                    </div>
                ) : (
                    filteredNotifications.map((notification) => {
                        const { IconComponent, bgColor, borderColor, iconBg, iconColor } = getNotificationStyle(notification.type)

                        return (
                            <div
                                key={notification._id}
                                className={`${bgColor} ${borderColor} border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${!notification.isRead ? 'ring-2 ring-blue-200 dark:ring-blue-700' : ''
                                    }`}
                                onClick={() => !notification.isRead && handleMarkAsRead(notification._id)}
                            >
                                <div className="flex items-start">
                                    <div className={`${iconBg} rounded-full p-2 mr-4 flex-shrink-0`}>
                                        <IconComponent size={20} className={iconColor} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {notification.title}
                                            </h4>
                                            <div className="flex items-center ml-4">
                                                {!notification.isRead && (
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                                                )}
                                                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                    {formatDate(notification.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                        <p className={`mt-1 text-sm ${!notification.isRead ? 'text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400'}`}>
                                            {notification.message}
                                        </p>
                                        {notification.priority === 'high' && (
                                            <div className="mt-2">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100">
                                                    High Priority
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

export default Notifications
