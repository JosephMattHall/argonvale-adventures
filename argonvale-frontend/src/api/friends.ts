import axios from 'axios';

const API_URL = 'http://localhost:8000';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
};

export interface Friend {
    id: number;
    username: string;
    avatar_url: string;
    is_online: boolean;
}

export interface FriendRequest {
    id: number;
    user_id: number;
    friend_id: number;
    status: string;
    created_at: string;
    requester: Friend;
}

export const friendsApi = {
    getFriends: async (): Promise<Friend[]> => {
        const response = await axios.get(`${API_URL}/api/friends`, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    getOnlineFriends: async (): Promise<Friend[]> => {
        const response = await axios.get(`${API_URL}/api/friends/online`, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    getFriendRequests: async (): Promise<FriendRequest[]> => {
        const response = await axios.get(`${API_URL}/api/friends/requests`, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    sendFriendRequest: async (username: string): Promise<void> => {
        await axios.post(`${API_URL}/api/friends/request/${username}`, {}, {
            headers: getAuthHeaders()
        });
    },

    acceptFriendRequest: async (requestId: number): Promise<void> => {
        await axios.post(`${API_URL}/api/friends/accept/${requestId}`, {}, {
            headers: getAuthHeaders()
        });
    },

    removeFriend: async (friendId: number): Promise<void> => {
        await axios.delete(`${API_URL}/api/friends/${friendId}`, {
            headers: getAuthHeaders()
        });
    }
};
