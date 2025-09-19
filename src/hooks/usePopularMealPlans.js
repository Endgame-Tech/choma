// src/hooks/usePopularMealPlans.js
import { useState, useEffect, useCallback } from "react";
import apiService from "../services/api";

export const usePopularMealPlans = () => {
  const [popularPlans, setPopularPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPopularPlans = useCallback(
    async (showRefreshing = false, forceRefresh = false) => {
      try {
        if (showRefreshing) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        console.log(
          "⭐ Fetching popular meal plans from backend...",
          forceRefresh ? "(forced refresh)" : ""
        );
        const response = await apiService.getPopularMealPlans(forceRefresh);

        if (response.success) {
          console.log(`✅ Successfully loaded ${response.data.length} popular meal plans`);
          setPopularPlans(response.data);

          if (response.offline) {
            console.log("📱 Using offline popular plans data");
          }
        } else {
          setError(response.error || "Failed to load popular meal plans");
          console.error("❌ Failed to fetch popular meal plans:", response.error);
        }
      } catch (err) {
        const errorMessage =
          "Failed to load popular meal plans. Please check your connection.";
        setError(errorMessage);
        console.error("❌ Popular meal plans fetch error:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  const refreshPopularPlans = useCallback(
    (forceRefresh = true) => {
      fetchPopularPlans(true, forceRefresh);
    },
    [fetchPopularPlans]
  );

  useEffect(() => {
    fetchPopularPlans();
  }, [fetchPopularPlans]);

  return {
    popularPlans,
    loading,
    error,
    refreshing,
    refreshPopularPlans,
    refetch: fetchPopularPlans,
    forceRefresh: () => fetchPopularPlans(false, true),
  };
};

export default usePopularMealPlans;