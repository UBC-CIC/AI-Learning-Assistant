import React, { createContext, useState, useContext } from "react";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState({});

  const setNotificationForCourse = (courseId, hasNotification) => {
    setNotifications((prev) => ({ ...prev, [courseId]: hasNotification }));
  };

  return (
    <NotificationContext.Provider value={{ notifications, setNotificationForCourse }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
};