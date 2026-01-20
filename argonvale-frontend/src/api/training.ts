import axios from 'axios';
// unused companion import removed

const API_URL = 'http://localhost:8000';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
};

export const trainingApi = {
    trainCompanion: async (companionId: number, stat: string): Promise<any> => {
        const response = await axios.post(
            `${API_URL}/api/companions/train/${companionId}`,
            null,
            {
                params: { stat },
                headers: getAuthHeaders()
            }
        );
        return response.data;
    },

    healCompanion: async (companionId: number): Promise<any> => {
        const response = await axios.post(
            `${API_URL}/api/companions/heal/${companionId}`,
            {},
            {
                headers: getAuthHeaders()
            }
        );
        return response.data;
    }
};
