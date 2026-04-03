import { useEffect, useRef, useCallback } from "react";
import { logout } from "../utils/auth";

// Session timeout duration: 15 minutes (900,000 milliseconds)
const SESSION_TIMEOUT = 15 * 60 * 1000;

/**
 * Custom hook to manage session timeout based on user inactivity
 * Automatically logs out user after 15 minutes of inactivity
 */
export const useSessionTimeout = (isAuthenticated) => {
  const timeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Clear the existing timeout
  const clearSessionTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Perform logout due to inactivity
  const handleInactiveLogout = useCallback(() => {
    const inactiveDuration = Date.now() - lastActivityRef.current;
    if (inactiveDuration >= SESSION_TIMEOUT) {
      // Store a flag to show session expired message on login page
      localStorage.setItem("session_expired", "true");
      logout();
    }
  }, []);

  // Reset the session timeout timer
  const resetSessionTimeout = useCallback(() => {
    lastActivityRef.current = Date.now();
    localStorage.setItem("last_activity", lastActivityRef.current.toString());

    clearSessionTimeout();

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      handleInactiveLogout();
    }, SESSION_TIMEOUT);
  }, [clearSessionTimeout, handleInactiveLogout]);

  useEffect(() => {
    // Only track activity if user is authenticated
    if (!isAuthenticated) {
      clearSessionTimeout();
      return;
    }

    // Activity events to track
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
      "input",
      "change",
    ];

    // Event handler for user activity
    const handleActivity = () => {
      resetSessionTimeout();
    };

    // Add event listeners for all activity events
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, true);
    });

    // Initialize the timeout
    resetSessionTimeout();

    // Cleanup function
    return () => {
      clearSessionTimeout();
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity, true);
      });
    };
  }, [isAuthenticated, clearSessionTimeout, resetSessionTimeout]);

  // Additional effect to check session on window focus (handles multi-tab scenarios)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const lastActivity = parseInt(
          localStorage.getItem("last_activity") || "0",
          10,
        );
        const inactiveDuration = Date.now() - lastActivity;

        if (inactiveDuration >= SESSION_TIMEOUT) {
          localStorage.setItem("session_expired", "true");
          logout();
        } else {
          // Reset timeout with remaining time
          resetSessionTimeout();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated, resetSessionTimeout]);

  return { resetSessionTimeout, clearSessionTimeout };
};

export default useSessionTimeout;
