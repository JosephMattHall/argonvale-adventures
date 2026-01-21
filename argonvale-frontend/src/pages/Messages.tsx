import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { messagesApi } from '../api/messages';
import type { Conversation, Message } from '../api/messages';
import { useNotifications } from '../context/NotificationContext';
import { useUser } from '../context/UserContext';
import { Send, User, MessageSquarePlus, ChevronLeft, Swords, Shield, Heart, Zap } from 'lucide-react';

const Messages: React.FC = () => {
    const { userId } = useParams<{ userId?: string }>();
    const navigate = useNavigate();
    const { refreshUnreadCount } = useNotifications();
    const { profile } = useUser();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [isStartingNew, setIsStartingNew] = useState(false);
    const [newConvUsername, setNewConvUsername] = useState('');
    const [newConvMessage, setNewConvMessage] = useState('');

    useEffect(() => {
        loadConversations();
    }, []);

    useEffect(() => {
        if (userId && conversations.length > 0) {
            const currentSelectedId = selectedConversation?.user_id;
            if (currentSelectedId !== parseInt(userId)) {
                const conv = conversations.find(c => c.user_id === parseInt(userId));
                if (conv) {
                    selectConversation(conv);
                }
            }
        }
    }, [userId, conversations, selectedConversation?.user_id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadConversations = async () => {
        try {
            const data = await messagesApi.getConversations();
            setConversations(data);
        } catch (error) {
            console.error('Failed to load conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const selectConversation = async (conversation: Conversation) => {
        setSelectedConversation(conversation);
        setIsStartingNew(false);
        navigate(`/game/messages/${conversation.user_id}`);

        try {
            const messagesData = await messagesApi.getConversation(conversation.user_id);
            setMessages(messagesData);

            // Mark as read
            await messagesApi.markConversationRead(conversation.user_id);
            refreshUnreadCount();

            // Update conversation list
            loadConversations();
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConversation) return;

        try {
            await messagesApi.sendMessage(selectedConversation.user_id, newMessage);
            setNewMessage('');

            // Reload messages
            const messagesData = await messagesApi.getConversation(selectedConversation.user_id);
            setMessages(messagesData);
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const handleStartNewConversation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newConvUsername.trim() || !newConvMessage.trim()) return;

        try {
            const result = await messagesApi.startConversation(newConvUsername, newConvMessage);
            setNewConvUsername('');
            setNewConvMessage('');
            setIsStartingNew(false);

            // Reload and select
            const updatedConversations = await messagesApi.getConversations();
            setConversations(updatedConversations);

            const newConv = updatedConversations.find(c => c.user_id === result.recipient_id);
            if (newConv) {
                selectConversation(newConv);
            }
        } catch (error: any) {
            alert(error.response?.data?.detail || "Failed to start conversation");
        }
    };

    const handleRespondToChallenge = async (messageId: number, accept: boolean) => {
        try {
            const result = await messagesApi.respondToChallenge(messageId, accept);
            if (accept && result.combat_id) {
                // Handle combat start
                console.log("Accepted! Combat ID:", result.combat_id);
            }
            // Reload conversation
            if (selectedConversation) {
                selectConversation(selectedConversation);
            }
        } catch (error) {
            console.error('Failed to respond to challenge:', error);
            alert('Failed to process challenge');
        }
    };

    const handleEnterBattle = (combatId: string, metadata: any) => {
        // Navigate to battle with the appropriate context
        // We might need to fetch the companion data or trust the metadata
        const isChallenger = metadata.challenger_companion.owner_id === profile?.id;

        const battleContext = {
            enemy_name: selectedConversation?.username || "Opponent",
            enemy_hp: isChallenger ? metadata.target_companion?.stats.hp : metadata.challenger_companion?.stats.hp,
            enemy_max_hp: isChallenger ? metadata.target_companion?.stats.hp : metadata.challenger_companion?.stats.hp,
            enemy_type: "PvP",
            mode: "pvp" as const,
            player_hp: isChallenger ? metadata.challenger_companion?.stats.hp : metadata.target_companion?.stats.hp,
            player_max_hp: isChallenger ? metadata.challenger_companion?.stats.hp : metadata.target_companion?.stats.hp,
            companion_id: isChallenger ? metadata.challenger_companion?.id : metadata.target_companion?.id,
            companion_name: isChallenger ? metadata.challenger_companion?.name : metadata.target_companion?.name,
            companion_stats: {
                str: isChallenger ? metadata.challenger_companion?.stats.str : metadata.target_companion?.stats.str,
                def: isChallenger ? metadata.challenger_companion?.stats.def : metadata.target_companion?.stats.def,
                spd: 10
            },
            equipped_items: []
        };

        navigate('/game/battle', {
            state: {
                combat_id: combatId,
                battleContext: battleContext,
                origin: 'messages'
            }
        });
    };
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-xl text-gray-400">Loading messages...</div>
            </div>
        );
    }

    return (
        <div className="h-full flex relative overflow-hidden">
            {/* Left Column - Conversations List - Hidden on mobile if thread is open */}
            <div className={`
                ${selectedConversation ? 'hidden md:flex' : 'flex'} 
                w-full md:w-80 border-r border-border-subtle flex-col bg-dark/20 h-full
            `}>
                <div className="p-4 border-b border-border-subtle flex justify-between items-center">
                    <h2 className="text-xl font-medieval text-white">Messages</h2>
                    <button
                        onClick={() => setIsStartingNew(!isStartingNew)}
                        className={`p-2 rounded-full transition-colors ${isStartingNew ? 'bg-primary text-white' : 'text-gold hover:bg-gold/10'}`}
                        title="New Conversation"
                    >
                        <MessageSquarePlus size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto">
                    {isStartingNew && (
                        <div className="p-4 border-b border-border-subtle bg-primary/5">
                            <form onSubmit={handleStartNewConversation} className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Username..."
                                    value={newConvUsername}
                                    onChange={(e) => setNewConvUsername(e.target.value)}
                                    className="input-field w-full text-sm"
                                    autoFocus
                                />
                                <textarea
                                    placeholder="Message..."
                                    value={newConvMessage}
                                    onChange={(e) => setNewConvMessage(e.target.value)}
                                    className="input-field w-full text-sm h-20 resize-none"
                                />
                                <button type="submit" className="btn-primary w-full text-sm">
                                    Start Chat
                                </button>
                            </form>
                        </div>
                    )}

                    {conversations.length > 0 ? (
                        conversations.map((conv) => (
                            <button
                                key={conv.user_id}
                                onClick={() => selectConversation(conv)}
                                className={`w-full p-4 border-b border-border-subtle hover:bg-card-hover transition-colors text-left ${selectedConversation?.user_id === conv.user_id ? 'bg-card-hover' : ''
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 bg-dark rounded-lg flex items-center justify-center flex-shrink-0">
                                        <User size={24} className="text-gold" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-semibold text-white">{conv.username}</span>
                                            {conv.unread_count > 0 && (
                                                <span className="bg-danger text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                                    {conv.unread_count}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-400 truncate">{conv.last_message}</p>
                                    </div>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="p-4 text-center text-gray-400">
                            No conversations yet
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column - Message Thread - Hidden on mobile if no thread is open */}
            <div className={`
                ${!selectedConversation ? 'hidden md:flex' : 'flex'} 
                flex-1 flex-col h-full bg-dark/40
            `}>
                {selectedConversation ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-border-subtle flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedConversation(null)}
                                    className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <div className="w-10 h-10 bg-dark rounded-lg flex items-center justify-center">
                                    <User size={20} className="text-gold" />
                                </div>
                                <Link to={`/game/profile/${selectedConversation.username}`} className="text-lg font-semibold text-white hover:text-gold transition-colors">
                                    {selectedConversation.username}
                                </Link>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-auto p-4 space-y-4">
                            {messages.map((msg) => {
                                const isOwn = msg.sender_id === profile?.id;
                                const isChallenge = msg.message_type === 'challenge';
                                let challenge_metadata: any = null;
                                try {
                                    if (isChallenge && msg.challenge_metadata) challenge_metadata = JSON.parse(msg.challenge_metadata);
                                } catch (e) {
                                    console.error("Failed to parse metadata", e);
                                }

                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`
                                            max-w-[95%] md:max-w-lg p-3 rounded-2xl
                                            ${isOwn
                                                ? 'bg-primary text-white rounded-tr-none shadow-glow/20'
                                                : 'bg-dark-lighter text-gray-100 rounded-tl-none border border-white/5'}
                                        `}>
                                            <div className="flex flex-col">
                                                {!isOwn && (
                                                    <Link to={`/game/profile/${msg.sender_username}`} className="text-[10px] font-bold text-gold uppercase mb-1 hover:underline">
                                                        {msg.sender_username}
                                                    </Link>
                                                )}

                                                {isChallenge && challenge_metadata ? (
                                                    <div className="bg-black/40 rounded-xl p-4 border border-white/10 my-2">
                                                        <div className="flex items-center gap-2 mb-4 text-secondary">
                                                            <Swords size={20} />
                                                            <span className="font-medieval text-lg tracking-tight">Companion Duel!</span>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                                            {/* Challenger */}
                                                            <div className="space-y-2">
                                                                <div className="text-[8px] uppercase font-bold text-gray-500">Challenger</div>
                                                                <div className="text-xs font-bold text-white truncate">{challenge_metadata.challenger_companion.name}</div>
                                                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                                                                    <div className="flex items-center gap-1"><Heart size={8} className="text-red-400" />{challenge_metadata.challenger_companion.stats.hp}</div>
                                                                    <div className="flex items-center gap-1"><Swords size={8} className="text-orange-400" />{challenge_metadata.challenger_companion.stats.str}</div>
                                                                    <div className="flex items-center gap-1"><Shield size={8} className="text-blue-400" />{challenge_metadata.challenger_companion.stats.def}</div>
                                                                </div>
                                                            </div>

                                                            {/* VS */}
                                                            <div className="space-y-2 border-l border-white/5 pl-4">
                                                                <div className="text-[8px] uppercase font-bold text-gray-500">Target</div>
                                                                <div className="text-xs font-bold text-white truncate">{challenge_metadata.target_companion.name}</div>
                                                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                                                                    <div className="flex items-center gap-1"><Heart size={8} className="text-red-400" />{challenge_metadata.target_companion.stats.hp}</div>
                                                                    <div className="flex items-center gap-1"><Swords size={8} className="text-orange-400" />{challenge_metadata.target_companion.stats.str}</div>
                                                                    <div className="flex items-center gap-1"><Shield size={8} className="text-blue-400" />{challenge_metadata.target_companion.stats.def}</div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/5">
                                                            {challenge_metadata.status === 'pending' && !isOwn && (
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => handleRespondToChallenge(msg.id, true)}
                                                                        className="flex-1 btn-primary py-2 text-xs font-bold"
                                                                    >Accept</button>
                                                                    <button
                                                                        onClick={() => handleRespondToChallenge(msg.id, false)}
                                                                        className="flex-1 bg-white/5 hover:bg-white/10 rounded-lg py-2 text-xs font-bold transition-all text-white/60"
                                                                    >Decline</button>
                                                                </div>
                                                            )}

                                                            {challenge_metadata.status === 'accepted' && challenge_metadata.combat_id && (
                                                                <button
                                                                    onClick={() => handleEnterBattle(challenge_metadata.combat_id, challenge_metadata)}
                                                                    className="w-full btn-primary py-2 text-xs font-bold flex items-center justify-center gap-2"
                                                                >
                                                                    <Zap size={14} className="animate-pulse" />
                                                                    Enter Battle
                                                                </button>
                                                            )}

                                                            {challenge_metadata.status === 'declined' && (
                                                                <div className="text-center py-1 text-[10px] font-bold uppercase text-red-500/60 tracking-widest">Challenge Declined</div>
                                                            )}

                                                            {challenge_metadata.status === 'pending' && isOwn && (
                                                                <div className="text-center py-1 text-[10px] font-bold uppercase text-gold/40 tracking-widest italic animate-pulse">Waiting for opponent...</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm md:text-base leading-relaxed">{msg.content}</p>
                                                )}
                                            </div>
                                            <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/60 text-right' : 'text-gray-500'}`}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-border-subtle">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="input-field flex-1"
                                />
                                <button type="submit" className="btn-primary flex items-center gap-2">
                                    <Send size={18} />
                                    Send
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        Select a conversation to start messaging
                    </div>
                )}
            </div>
        </div>
    );
};

export default Messages;
