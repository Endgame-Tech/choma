import React from 'react';
import { 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { ToastNotification, NOTIFICATION_UI_CONFIG } from '../types/notifications';
import { useNotifications } from '../contexts/NotificationContext';

interface ToastItemProps {
  toast: ToastNotification;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const config = NOTIFICATION_UI_CONFIG[toast.severity];
  
  const getIcon = () => {
    switch (toast.severity) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'error':
        return <ExclamationCircleIcon className="w-5 h-5" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5" />;
      case 'info':
      default:
        return <InformationCircleIcon className="w-5 h-5" />;
    }
  };

  const handleAction = () => {
    if (toast.onAction) {
      toast.onAction();
    }
    onDismiss(toast.id);
  };

  const handleDismiss = () => {
    onDismiss(toast.id);
  };

  return (
    <div
      className={`
        max-w-sm w-full ${config.bgColor} ${config.borderColor} border rounded-lg shadow-lg 
        transform transition-all duration-300 ease-in-out
        hover:shadow-xl hover:scale-105
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="p-4">
        <div className="flex items-start">
          {/* Icon */}
          <div className={`flex-shrink-0 ${config.textColor}`}>
            {getIcon()}
          </div>

          {/* Content */}
          <div className="ml-3 w-0 flex-1">
            <p className={`text-sm font-medium ${config.textColor}`}>
              {toast.title}
            </p>
            <p className={`mt-1 text-sm text-gray-600 dark:text-gray-300`}>
              {toast.message}
            </p>

            {/* Action Button */}
            {toast.actionLabel && toast.onAction && (
              <div className="mt-3">
                <button
                  onClick={handleAction}
                  className={`
                    inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md
                    ${toast.severity === 'error' 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : toast.severity === 'warning'
                      ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                      : toast.severity === 'success'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }
                    transition-colors duration-200
                  `}
                >
                  {toast.actionLabel}
                </button>
              </div>
            )}
          </div>

          {/* Dismiss Button */}
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleDismiss}
              className={`
                inline-flex rounded-md ${config.textColor} hover:opacity-75 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-400
              `}
              aria-label="Dismiss notification"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar for Auto-dismiss */}
        {toast.duration && toast.duration > 0 && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
              <div 
                className={`
                  h-1 w-full rounded-full animate-shrink
                  ${toast.severity === 'error' 
                    ? 'bg-red-500' 
                    : toast.severity === 'warning'
                    ? 'bg-yellow-500'
                    : toast.severity === 'success'
                    ? 'bg-green-500'
                    : 'bg-blue-500'
                  }
                `}
                style={{ '--toast-duration': `${toast.duration}ms` } as React.CSSProperties}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="assertive"
      className="fixed inset-0 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end z-50"
    >
      <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto w-full max-w-sm overflow-hidden"
          >
            <ToastItem
              toast={toast}
              onDismiss={dismissToast}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;