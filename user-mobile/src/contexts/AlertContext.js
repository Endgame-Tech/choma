import React, { createContext, useContext, useState } from "react";
import CustomAlert from "../components/ui/CustomAlert";

const AlertContext = createContext();

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within AlertProvider");
  }
  return context;
};

export const AlertProvider = ({ children }) => {
  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
    buttons: [],
    type: "info",
    icon: null,
  });

  const showAlert = ({
    title,
    message,
    buttons = [],
    type = "info",
    icon = null,
  }) => {
    setAlert({
      visible: true,
      title,
      message,
      buttons,
      type,
      icon,
    });
  };

  const hideAlert = () => {
    setAlert((prev) => ({ ...prev, visible: false }));
  };

  // Helper methods for common alert types
  const showSuccess = (title, message, buttons = []) => {
    showAlert({ title, message, buttons, type: "success" });
  };

  const showError = (title, message, buttons = []) => {
    showAlert({ title, message, buttons, type: "error" });
  };

  const showWarning = (title, message, buttons = []) => {
    showAlert({ title, message, buttons, type: "warning" });
  };

  const showInfo = (title, message, buttons = []) => {
    showAlert({ title, message, buttons, type: "info" });
  };

  const showConfirm = (title, message, onConfirm, onCancel = null) => {
    const buttons = [
      {
        text: "Cancel",
        style: "cancel",
        onPress: onCancel || (() => {}),
      },
      {
        text: "Confirm",
        style: "primary",
        onPress: onConfirm,
      },
    ];
    showAlert({ title, message, buttons, type: "confirm" });
  };

  // New helper methods matching your designs
  const showDeleteConfirm = (title, message, onConfirm, onCancel = null) => {
    const buttons = [
      {
        text: "Cancel",
        style: "cancel",
        onPress: onCancel || (() => {}),
      },
      {
        text: "Yes, Delete",
        style: "destructive",
        onPress: onConfirm,
      },
    ];
    showAlert({ title, message, buttons, type: "warning" });
  };

  const showPaymentSuccess = (
    title = "Payment Successful!",
    message = "Thank you! Your transaction is complete.",
    onViewReceipt = null
  ) => {
    const buttons = onViewReceipt
      ? [
          {
            text: "View Receipt",
            style: "primary",
            onPress: onViewReceipt,
          },
        ]
      : [];
    showAlert({ title, message, buttons, type: "success" });
  };

  const showUpdateReminder = (
    title = "Reminder",
    message = "To apply these changes, you'll need to refresh your preferences.",
    onUpdate = null
  ) => {
    const buttons = onUpdate
      ? [
          {
            text: "Update Settings",
            style: "primary",
            onPress: onUpdate,
          },
        ]
      : [];
    showAlert({ title, message, buttons, type: "info" });
  };

  const showRetryError = (
    title = "Something went wrong?",
    message = "We couldn't complete your request due to a server error. Please try again.",
    onRetry = null
  ) => {
    const buttons = onRetry
      ? [
          {
            text: "Retry",
            style: "primary",
            onPress: onRetry,
          },
        ]
      : [];
    showAlert({ title, message, buttons, type: "error" });
  };

  const value = {
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    showDeleteConfirm,
    showPaymentSuccess,
    showUpdateReminder,
    showRetryError,
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        type={alert.type}
        icon={alert.icon}
        onDismiss={hideAlert}
      />
    </AlertContext.Provider>
  );
};
