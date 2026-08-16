import { useEffect, useState } from "react";
import API from "../api";

export default function useLiveMarks(assessmentId, interval = 5000) {
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!assessmentId) return;

    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);

        const res = await API.get(`/marks/${assessmentId}`);

        if (isMounted) {
          setMarks(res.data || []);
        }
      } catch (err) {
        console.error("Live marks error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const timer = setInterval(fetchData, interval);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [assessmentId, interval]);

  return { marks, loading };
}