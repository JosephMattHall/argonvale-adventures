import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGameSocket } from '../hooks/useGameSocket';
import axios from 'axios';

interface NotificationContextType {
    unreadCount: number;
    refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [unreadCount, setUnreadCount] = useState(0);
    const { messages } = useGameSocket();

    const refreshUnreadCount = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:8000/api/messages/unread-count', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUnreadCount(response.data.count);
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    };

    // Listen for WebSocket message notifications
    useEffect(() => {
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.type === 'MessageReceived') {
                refreshUnreadCount();
            }
        }
    }, [messages]);

    // Initial fetch
    useEffect(() => {
        refreshUnreadCount();
    }, []);

    return (
        <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};
