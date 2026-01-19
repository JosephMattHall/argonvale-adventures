import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const WS_URL = 'ws://localhost:8000/ws';

export const useGameSocket = () => {
    const { token } = useAuth();
    const socket = useRef<WebSocket | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!token) return;

        // Connect with token in query param (common pattern for WS auth)
        const ws = new WebSocket(`${WS_URL}?token=${token}`);

        ws.onopen = () => {
            console.log('Connected to Game Server');
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setMessages((prev) => [...prev, data]);
            } catch (e) {
                console.error('Failed to parse WS message', e);
            }
        };

        ws.onclose = () => {
            console.log('Disconnected from Game Server');
            setIsConnected(false);
        };

        socket.current = ws;

        return () => {
            ws.close();
        };
    }, [token]);

    const sendCommand = (command: object) => {
        if (socket.current && isConnected) {
            socket.current.send(JSON.stringify(command));
        }
    };

    return { messages, isConnected, sendCommand };
};
