'use client';

import React, { createContext, useContext, useState } from 'react';
import { AddProductDrawer } from '../components/AddProductDrawer';

interface DrawerContextType {
  isAddProductOpen: boolean;
  openAddProduct: () => void;
  closeAddProduct: () => void;
}

const DrawerContext = createContext<DrawerContextType>({
  isAddProductOpen: false,
  openAddProduct: () => {},
  closeAddProduct: () => {},
});

export const DrawerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  const openAddProduct = () => setIsAddProductOpen(true);
  const closeAddProduct = () => setIsAddProductOpen(false);

  return (
    <DrawerContext.Provider value={{ isAddProductOpen, openAddProduct, closeAddProduct }}>
      {children}
      <AddProductDrawer
        isOpen={isAddProductOpen}
        onClose={closeAddProduct}
      />
    </DrawerContext.Provider>
  );
};

export const useDrawer = () => useContext(DrawerContext);
