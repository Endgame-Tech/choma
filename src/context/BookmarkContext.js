import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BookmarkContext = createContext();

export const useBookmarks = () => {
  const context = useContext(BookmarkContext);
  if (!context) {
    throw new Error('useBookmarks must be used within a BookmarkProvider');
  }
  return context;
};

export const BookmarkProvider = ({ children }) => {
  const [bookmarkedItems, setBookmarkedItems] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // Load bookmarks from AsyncStorage on app start
  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      const savedBookmarks = await AsyncStorage.getItem('bookmarkedMealPlans');
      if (savedBookmarks) {
        const bookmarkArray = JSON.parse(savedBookmarks);
        setBookmarkedItems(new Set(bookmarkArray));
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveBookmarks = async (bookmarkSet) => {
    try {
      const bookmarkArray = Array.from(bookmarkSet);
      await AsyncStorage.setItem('bookmarkedMealPlans', JSON.stringify(bookmarkArray));
    } catch (error) {
      console.error('Error saving bookmarks:', error);
    }
  };

  const toggleBookmark = async (itemId) => {
    setBookmarkedItems(prevBookmarks => {
      const newBookmarks = new Set(prevBookmarks);
      
      if (newBookmarks.has(itemId)) {
        newBookmarks.delete(itemId);
      } else {
        newBookmarks.add(itemId);
      }
      
      // Save to AsyncStorage
      saveBookmarks(newBookmarks);
      
      return newBookmarks;
    });
  };

  const isBookmarked = (itemId) => {
    return bookmarkedItems.has(itemId);
  };

  const getBookmarkedItems = () => {
    return Array.from(bookmarkedItems);
  };

  const clearAllBookmarks = async () => {
    try {
      await AsyncStorage.removeItem('bookmarkedMealPlans');
      setBookmarkedItems(new Set());
    } catch (error) {
      console.error('Error clearing bookmarks:', error);
    }
  };

  const value = {
    bookmarkedItems,
    loading,
    toggleBookmark,
    isBookmarked,
    getBookmarkedItems,
    clearAllBookmarks,
  };

  return (
    <BookmarkContext.Provider value={value}>
      {children}
    </BookmarkContext.Provider>
  );
};

export default BookmarkContext;