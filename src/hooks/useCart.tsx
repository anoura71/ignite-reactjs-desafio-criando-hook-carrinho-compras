import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';


interface CartProviderProps {
  children: ReactNode;
}


interface UpdateProductAmount {
  productId: number;
  amount: number;
}


interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}


const CartContext = createContext<CartContextData>({} as CartContextData);


export function CartProvider({ children }: CartProviderProps): JSX.Element {


  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });


  const addProduct = async (productId: number) => {

    try {
      // Verifica se o produto já está no carrinho
      const productInCart = cart.find(product => product.id === productId);

      // Busca informação do produto no estoque
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
      // Quantidade atual do produto em estoque
      const stockAmount = stock.amount;
      // Quantidade atual do produto no carrinho
      const currentAmount = productInCart ? productInCart.amount : 0;
      // Quantidade do produto solicitada pelo usuário no carrinho
      const requestedAmount = currentAmount + 1;

      if (requestedAmount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      if (productInCart) {
        // Atualiza a quantidade do produto no carrinho (incrementando em 1 unidade)
        productInCart.amount = requestedAmount;
      } else {
        // Busca o produto
        const { data: product } = await api.get<Product>(`/products/${productId}`);

        // Inclui o produto no carrinho, com a quantidade = 1
        updatedCart.push({ ...product, amount: 1 });
      }

      // Atualiza o carrinho
      setCart(updatedCart);
      // Guarda o carrinho na local storage
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };


  const removeProduct = (productId: number) => {

    try {
      // Verifica se o produto está no carrinho
      const productInCart = cart.find(product => product.id === productId);
      if (!productInCart) {
        throw new Error();
      }

      // Remove o produto do carrinho
      const updatedCart = cart.filter(product => product.id !== productId);
      // Atualiza o carrinho
      setCart(updatedCart);
      // Guarda o carrinho na local storage
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };


  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {

    try {
      if (amount <= 0) {
        // Não é possível atualizar para a quantidade = 0
        return;
      }

      // Busca o produto no estoque
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
      // Quantidade atual do produto em estoque
      const stockAmount = stock.amount;

      // Verifica se a quantidade em estoque é suficiente
      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      // Busca o produto no carrinho
      const productInCart = cart.find(product => product.id === productId);
      if (!productInCart) {
        throw new Error();
      }

      // Atualiza a quantidade do produto no carrinho
      const updatedCart = cart.map(product => {
        if (product.id === productId) {
          product.amount = amount;
        }
        return product;
      });
      // Atualiza o carrinho
      setCart(updatedCart);
      // Guarda o carrinho na local storage
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };


  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );


}


export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
