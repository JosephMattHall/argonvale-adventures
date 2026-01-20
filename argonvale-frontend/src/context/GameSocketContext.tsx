
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

const WS_URL = 'ws://localhost:8000/ws';

interface GameSocketContextType {
    messages: any[];
    isConnected: boolean;
    sendCommand: (command: object) => void;
}

const GameSocketContext = createContext<GameSocketContextType | undefined>(undefined);

export const GameSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token } = useAuth();
    const socket = useRef<WebSocket | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    const [commandQueue, setCommandQueue] = useState<object[]>([]);

    useEffect(() => {
        if (!token) return;

        let ws: WebSocket | null = null;
        let retryTimeout: any;

        const connect = () => {
            // Prevent multiple connections
            if (socket.current && (socket.current.readyState === WebSocket.OPEN || socket.current.readyState === WebSocket.CONNECTING)) return;

            console.log("Connecting to Game Socket...");
            ws = new WebSocket(`${WS_URL}?token=${token}`);

            ws.onopen = () => {
                console.log('Connected to Game Server');
                setIsConnected(true);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (Array.isArray(data)) {
                        setMessages((prev) => [...prev, ...data]);
                    } else {
                        setMessages((prev) => [...prev, data]);
                    }
                } catch (e) {
                    console.error('Failed to parse WS message', e);
                }
            };

            ws.onclose = () => {
                console.log('Disconnected from Game Server');
                setIsConnected(false);
                socket.current = null;

                // Auto-reconnect after 3 seconds
                retryTimeout = setTimeout(connect, 3000);
            };

            socket.current = ws;
        };

        connect();

        return () => {
            clearTimeout(retryTimeout);
            if (socket.current) {
                console.log("Closing socket connection");
                socket.current.close();
                socket.current = null;
            }
        };
    }, [token]);

    // Flus queue when connected
    useEffect(() => {
        if (isConnected && socket.current && commandQueue.length > 0) {
            console.log(`Flushing ${commandQueue.length} queued commands`);
            commandQueue.forEach(cmd => {
                socket.current?.send(JSON.stringify(cmd));
            });
            setCommandQueue([]);
        }
    }, [isConnected, commandQueue]);

    const sendCommand = (command: object) => {
        if (socket.current && socket.current.readyState === WebSocket.OPEN) {
            socket.current.send(JSON.stringify(command));
        } else {
            console.log("Socket not ready, queuing command:", command);
            setCommandQueue(prev => [...prev, command]);
        }
    };

    return (
        <GameSocketContext.Provider value={{ messages, isConnected, sendCommand }}>
            {children}
        </GameSocketContext.Provider>
    );
};

export const useGameSocket = () => {
    const context = useContext(GameSocketContext);
    if (context === undefined) {
        throw new Error('useGameSocket must be used within a GameSocketProvider');
    }
    return context;
};
