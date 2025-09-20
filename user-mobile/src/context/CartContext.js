import React, { createContext, useState, useContext } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [totalPrice, setTotalPrice] = useState(0);

  const value = {
    selectedBundle,
    totalPrice,
    setSelectedBundle,
    setTotalPrice,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
