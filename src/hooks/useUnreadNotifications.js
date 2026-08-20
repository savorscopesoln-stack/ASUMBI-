import { useEffect, useState, useCallback } from "react";
import API from "../api";

/* Polls GET /api/notifications/unread-count so a sidebar/header Bell
   icon can show a live badge. Any page can pause its own polling by
   unmounting — this hook doesn't touch anything outside its own
   interval, so multiple instances (e.g. sidebar + a notifications
   page) are safe to run at once. */
export default function useUnreadNotifications(intervalMs = 20000) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await API.get("/notifications/unread-count");
      setCount(res.data?.count || 0);
    } catch (err) {
      // stay quiet — a failed poll shouldn't spam the console every 20s
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  return { count, refresh };
}
