import axios from 'axios';
import { getAuthHeaders, API_URL } from './companions';

export interface Item {
    id: number;
    name: string;
    item_type: string;
    weapon_stats: any;
    stats?: any;
    is_equipped: boolean;
}

export const equipmentApi = {
    getInventory: async (): Promise<Item[]> => {
        const response = await axios.get(`${API_URL}/api/equipment/inventory`, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    async toggleEquip(itemId: number) {
        const response = await axios.post(`${API_URL}/api/equipment/toggle/${itemId}`, {}, { headers: getAuthHeaders() });
        return response.data;
    },
    async usePotion(itemId: number) {
        const response = await axios.post(`${API_URL}/api/equipment/use/${itemId}`, {}, { headers: getAuthHeaders() });
        return response.data;
    },
    async seedTestItems() {
        const response = await axios.post(`${API_URL}/api/equipment/seed-test-items`, {}, { headers: getAuthHeaders() });
        return response.data;
    }
};
