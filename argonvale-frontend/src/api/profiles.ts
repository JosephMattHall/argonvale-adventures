import axios from 'axios';

const API_URL = 'http://localhost:8000';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
};

export interface Profile {
    id: number;
    username: string;
    bio: string;
    avatar_url: string;
    role: string;
    coins: number;
    has_starter: boolean;
    pvp_wins: number;
    pvp_total: number;
    last_x: number;
    last_y: number;
    last_zone_id: string;
    title: string;
    titles_unlocked: string; // JSON string
}

export interface Companion {
    id: number;
    name: string;
    species: string;
    element: string;
    image_url: string;
    level: number;
    hp: number;
    max_hp: number;
    strength: number;
    defense: number;
    speed: number;
    is_active: boolean;
    status: string;
    hunger: number;
    last_fed_at: string;
    current_combat_id?: string | null;
}

export const profilesApi = {
    getMyProfile: async (): Promise<Profile> => {
        const response = await axios.get(`${API_URL}/api/profiles/me`, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    updateMyProfile: async (data: { bio?: string; avatar_url?: string; title?: string }): Promise<Profile> => {
        const response = await axios.put(`${API_URL}/api/profiles/me`, data, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    getUserProfile: async (username: string): Promise<Profile> => {
        const response = await axios.get(`${API_URL}/api/profiles/${username}`, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    getUserCompanions: async (username: string): Promise<Companion[]> => {
        const response = await axios.get(`${API_URL}/api/profiles/${username}/companions`, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    addTestCoins: async (): Promise<Profile> => {
        const response = await axios.post(`${API_URL}/api/profiles/test/add-coins`, {}, {
            headers: getAuthHeaders()
        });
        return response.data;
    }
};
