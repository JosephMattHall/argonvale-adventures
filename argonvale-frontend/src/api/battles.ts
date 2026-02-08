import api from './client';

export const battlesApi = {
    startPracticeBattle: async (companionId: number) => {
        const response = await api.post('/api/battles/practice', { companion_id: companionId });
        return response.data;
    }
};
