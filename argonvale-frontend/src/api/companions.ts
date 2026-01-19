import axios from 'axios';
import type { Companion } from './profiles';

export const API_URL = 'http://localhost:8000';

export const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
};

export const companionsApi = {
    createStarter: async (species: string, customName: string, element: string): Promise<Companion> => {
        const response = await axios.post(`${API_URL}/api/companions/create-starter`, {
            species,
            custom_name: customName,
            element
        }, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    getActiveCompanions: async (): Promise<Companion[]> => {
        const response = await axios.get(`${API_URL}/api/companions/active`, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    getAllCompanions: async (): Promise<Companion[]> => {
        const response = await axios.get(`${API_URL}/api/companions/all`, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    toggleActive: async (companionId: number): Promise<void> => {
        await axios.put(`${API_URL}/api/companions/${companionId}/toggle-active`, {}, {
            headers: getAuthHeaders()
        });
    },

    summon: async (species: string, customName: string, element: string): Promise<Companion> => {
        const response = await axios.post(`${API_URL}/api/companions/summon`, {
            species,
            custom_name: customName,
            element
        }, {
            headers: getAuthHeaders()
        });
        return response.data;
    }
};
