import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ShopItem {
    id: number;
    name: string;
    item_type: string;
    price: number;
    category: string;
    description: string;
    image_url: string;
    stats: any;
    effect: any;
}

export const shopApi = {
    getItems: async () => {
        const response = await axios.get(`${API_URL}/api/shop/items`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return response.data as ShopItem[];
    },
    buyItem: async (itemId: number) => {
        const response = await axios.post(`${API_URL}/api/shop/buy/${itemId}`, {}, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return response.data;
    }
};
