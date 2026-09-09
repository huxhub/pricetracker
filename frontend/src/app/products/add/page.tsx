'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDrawer } from '../../../context/DrawerContext';

export default function AddProductPage() {
  const router = useRouter();
  const { openAddProduct } = useDrawer();

  useEffect(() => {
    openAddProduct();
    router.replace('/products');
  }, [openAddProduct, router]);

  return null;
}
