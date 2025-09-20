import React, { createContext, useContext, useState, useCallback } from "react";
import ToastNotification from "../components/ui/ToastNotification";

export const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((notification) => {
    const id = Date.now().toString();
    const toast = {
      id,
      ...notification,
      visible: true,
    };

    setToasts((prev) => [...prev, toast]);

    // Auto-remove after duration
    setTimeout(() => {
      removeToast(id);
    }, notification.duration || 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showNotificationToast = useCallback(
    (notification) => {
      showToast({
        title: notification.title,
        message: notification.body || notification.message,
        type: notification.type || "info",
        duration: 4000,
        onPress: notification.onPress,
      });
    },
    [showToast]
  );

  const contextValue = {
    showToast,
    showNotificationToast,
    removeToast,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {typeof children === "function" ? children(contextValue) : children}

      {/* Render all active toasts */}
      {toasts.map((toast, index) => (
        <ToastNotification
          key={toast.id}
          notification={toast}
          visible={toast.visible}
          onPress={(notification) => {
            removeToast(toast.id);
            toast.onPress?.(notification);
          }}
          onDismiss={() => removeToast(toast.id)}
          duration={toast.duration}
          style={{ top: 60 + index * 80 }} // Stack multiple toasts
        />
      ))}
    </ToastContext.Provider>
  );
};
