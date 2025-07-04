import { createContext, useState, useEffect, useContext } from 'react';
import { UserContext } from './UserContext';
import { fetchCart, saveCart } from '../api/api';

export const CartContext = createContext();

export function CartProvider({ children }) {
  const { userData } = useContext(UserContext); 
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  const mergeCarts = (local, backend) => {
    const map = new Map();
    [...local, ...backend].forEach((item) => {
      const id = item.productId?._id || item.productId || item._id;
      if (!map.has(id)) {
        map.set(id, { ...item, productId: id });
      } else {
        map.get(id).quantity += item.quantity;
      }
    });
    return Array.from(map.values());
  };

  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find(
        (item) => item.productId === product._id || item.productId?._id === product._id
      );

      if (existing) {
        return prev.map((item) =>
          (item.productId === product._id || item.productId?._id === product._id)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, { productId: product, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCartItems((prev) =>
      prev.filter((item) => {
        const id = item.productId?._id || item.productId;
        return id !== productId;
      })
    );
  };

  const updateQuantity = (productId, quantity) => {
    if (!quantity || quantity < 1) quantity = 1;

    setCartItems((prev) =>
      prev.map((item) => {
        const id = item.productId?._id || item.productId;
        return id === productId ? { ...item, quantity } : item;
      })
    );
  };

  const clearCart = () => setCartItems([]);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    const syncCart = async () => {
      if (userData?.token) {
        try {
          const backendCart = await fetchCart(userData.token);
          const merged = mergeCarts(cartItems, backendCart.items || []);
          setCartItems(merged);
          await saveCart(merged, userData.token);
        } catch (err) {
          console.error('Error syncing cart:', err.response?.status, err.response?.data);
        }
      }
    };

    syncCart();
  }, [userData?.token]);

  return (
    <CartContext.Provider
      value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, setCartItems }}
    >
      {children}
    </CartContext.Provider>
  );
}
