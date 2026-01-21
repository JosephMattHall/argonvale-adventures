import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface LeaderboardUser {
    username: string;
    pvp_wins: number;
    avatar_url: string;
    title: string;
}

export interface LeaderboardCompanion {
    name: string;
    species: string;
    level: number;
    element: string;
    owner_name: string;
    image_url: string;
}

export interface TrainingStatus {
    companion_id: number;
    status: string;
    busy_until: string | null;
    time_remaining: number;
}

export const managementApi = {
    getPvpLeaderboard: async (): Promise<LeaderboardUser[]> => {
        const response = await axios.get(`${API_BASE_URL}/api/management/leaderboards/pvp`);
        return response.data;
    },

    getCompanionLeaderboard: async (): Promise<LeaderboardCompanion[]> => {
        const response = await axios.get(`${API_BASE_URL}/api/management/leaderboards/companions`);
        return response.data;
    },

    startTraining: async (companionId: number) => {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_BASE_URL}/api/management/train/${companionId}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    claimTraining: async (companionId: number) => {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_BASE_URL}/api/management/claim/${companionId}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    rapidTrain: async (companionId: number) => {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_BASE_URL}/api/management/rapid-train/${companionId}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    getStatus: async (companionId: number): Promise<TrainingStatus> => {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/api/management/status/${companionId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    }
};
