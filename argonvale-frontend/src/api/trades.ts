import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface TradeItem {
    id: number;
    name: string;
    rarity: string;
    category: string;
    image_url: string;
}

export interface TradeLot {
    id: number;
    user_id: number;
    username: string;
    created_at: string;
    description: string;
    items: TradeItem[];
}

export interface TradeOffer {
    id: number;
    lot_id: number;
    offerer_id: number;
    offerer_username: string;
    offered_coins: number;
    offered_items: TradeItem[];
    status: string;
    timestamp: string;
}

export const tradesApi = {
    createTradeLot: async (itemIds: number[], description: string = ""): Promise<TradeLot> => {
        const response = await axios.post(`${API_URL}/api/trades/`, {
            item_ids: itemIds,
            description
        }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return response.data;
    },

    listTradeLots: async (page: number = 1, username?: string, itemName?: string): Promise<TradeLot[]> => {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        if (username) params.append('username', username);
        if (itemName) params.append('item_name', itemName);

        const response = await axios.get(`${API_URL}/api/trades/?${params.toString()}`);
        return response.data;
    },

    getUserTradeLots: async (username: string): Promise<TradeLot[]> => {
        const response = await axios.get(`${API_URL}/api/trades/user/${username}`);
        return response.data;
    },

    getMyTradeLots: async (): Promise<TradeLot[]> => {
        const response = await axios.get(`${API_URL}/api/trades/my`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return response.data;
    },

    deleteTradeLot: async (lotId: number): Promise<{ status: string }> => {
        const response = await axios.delete(`${API_URL}/api/trades/${lotId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return response.data;
    },

    // --- Offers ---

    createTradeOffer: async (lotId: number, offeredItemIds: number[], offeredCoins: number): Promise<TradeOffer> => {
        const response = await axios.post(`${API_URL}/api/trades/${lotId}/offers`, {
            offered_item_ids: offeredItemIds,
            offered_coins: offeredCoins
        }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return response.data;
    },

    listLotOffers: async (lotId: number): Promise<TradeOffer[]> => {
        const response = await axios.get(`${API_URL}/api/trades/${lotId}/offers`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return response.data;
    },

    acceptTradeOffer: async (offerId: number): Promise<{ status: string }> => {
        const response = await axios.post(`${API_URL}/api/trades/offers/${offerId}/accept`, {}, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return response.data;
    },

    rejectTradeOffer: async (offerId: number): Promise<{ status: string }> => {
        const response = await axios.post(`${API_URL}/api/trades/offers/${offerId}/reject`, {}, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return response.data;
    },

    cancelTradeOffer: async (offerId: number): Promise<{ status: string }> => {
        const response = await axios.delete(`${API_URL}/api/trades/offers/${offerId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return response.data;
    }
};
