/**
 * Custom hook for managing circular reveal animations in navigation
 */

import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export const useCircularReveal = (screenName) => {
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealComplete, setRevealComplete] = useState(false);

  const startReveal = useCallback((startPosition) => {
    setIsRevealing(true);
    setRevealComplete(false);
  }, []);

  const onRevealComplete = useCallback(() => {
    setRevealComplete(true);
  }, []);

  const resetReveal = useCallback(() => {
    setIsRevealing(false);
    setRevealComplete(false);
  }, []);

  // Reset when screen loses focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        resetReveal();
      };
    }, [resetReveal])
  );

  return {
    isRevealing,
    revealComplete,
    startReveal,
    onRevealComplete,
    resetReveal,
  };
};