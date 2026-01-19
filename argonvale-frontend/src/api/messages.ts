import axios from 'axios';

const API_URL = 'http://localhost:8000';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
};

export interface Message {
    id: number;
    sender_id: number;
    recipient_id: number;
    content: string;
    is_read: boolean;
    timestamp: string;
    sender_username: string;
}

export interface Conversation {
    user_id: number;
    username: string;
    avatar_url: string;
    last_message: string;
    last_message_time: string;
    unread_count: number;
}

export const messagesApi = {
    getConversations: async (): Promise<Conversation[]> => {
        const response = await axios.get(`${API_URL}/api/messages/conversations`, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    getConversation: async (userId: number): Promise<Message[]> => {
        const response = await axios.get(`${API_URL}/api/messages/conversation/${userId}`, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    sendMessage: async (recipientId: number, content: string): Promise<void> => {
        await axios.post(`${API_URL}/api/messages/send`, {
            recipient_id: recipientId,
            content
        }, {
            headers: getAuthHeaders()
        });
    },

    markConversationRead: async (userId: number): Promise<void> => {
        await axios.put(`${API_URL}/api/messages/read/${userId}`, {}, {
            headers: getAuthHeaders()
        });
    },

    startConversation: async (username: string, content: string): Promise<{ recipient_id: number }> => {
        const response = await axios.post(`${API_URL}/api/messages/start`, {
            username,
            content
        }, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    getUnreadCount: async (): Promise<number> => {
        const response = await axios.get(`${API_URL}/api/messages/unread-count`, {
            headers: getAuthHeaders()
        });
        return response.data.count;
    }
};
