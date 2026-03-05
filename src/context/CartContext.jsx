import { createContext, useContext, useReducer, useEffect } from 'react';

const CartContext = createContext(null);

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const existing = state.items.find((i) => i.id === action.product.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.id === action.product.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.product, quantity: 1 }],
      };
    }
    case 'REMOVE_FROM_CART':
      return {
        ...state,
        items: state.items.filter((i) => i.id !== action.productId),
      };
    case 'UPDATE_QUANTITY':
      if (action.quantity < 1) {
        return {
          ...state,
          items: state.items.filter((i) => i.id !== action.productId),
        };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === action.productId ? { ...i, quantity: action.quantity } : i
        ),
      };
    case 'CLEAR_CART':
      return { ...state, items: [] };
    default:
      return state;
  }
};

const loadCartFromStorage = () => {
  try {
    const saved = localStorage.getItem('jewellery-cart');
    return saved ? JSON.parse(saved) : { items: [] };
  } catch {
    return { items: [] };
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, undefined, loadCartFromStorage);

  useEffect(() => {
    localStorage.setItem('jewellery-cart', JSON.stringify(state));
  }, [state]);

  const addToCart = (product) => dispatch({ type: 'ADD_TO_CART', product });
  const removeFromCart = (productId) => dispatch({ type: 'REMOVE_FROM_CART', productId });
  const updateQuantity = (productId, quantity) =>
    dispatch({ type: 'UPDATE_QUANTITY', productId, quantity });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });

  const cartCount = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items: state.items, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal }}
    >
      {children}
    </CartContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
