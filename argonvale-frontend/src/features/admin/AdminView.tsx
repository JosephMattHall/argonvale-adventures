import React, { useState, useEffect } from 'react';
import { Shield, Users, Activity, Settings, AlertCircle, History, Hammer, CheckCircle2 } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import type { Profile } from '../../api/profiles';
import { fetchAdminStats, fetchAllUsers, fetchAuditLogs, updateUserRole } from '../../api/admin';
import type { AdminStats, AuditLogEntry } from '../../api/admin';

type Tab = 'users' | 'audit' | 'assets';

const AdminView: React.FC = () => {
    const { profile, loading: userLoading } = useUser();
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<Profile[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
    const [activeTab, setActiveTab] = useState<Tab>('users');
    const [loading, setLoading] = useState(true);
    const [actionMessage, setActionMessage] = useState<string | null>(null);

    const loadData = async () => {
        try {
            const [statsData, usersData, auditData] = await Promise.all([
                fetchAdminStats(),
                fetchAllUsers(),
                fetchAuditLogs()
            ]);
            setStats(statsData);
            setUsers(usersData);
            setAuditLogs(auditData);
        } catch (err) {
            console.error("Failed to fetch admin data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleRoleChange = async (userId: number, newRole: string) => {
        try {
            await updateUserRole(userId, newRole);
            setActionMessage(`Role updated to ${newRole}`);
            loadData(); // Refresh
            setTimeout(() => setActionMessage(null), 3000);
        } catch (err) {
            console.error("Role change failed", err);
        }
    };

    if (userLoading || (loading && !stats)) {
        return (
            <div className="h-full flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (profile?.role !== 'admin') {
        return (
            <div className="h-full flex items-center justify-center p-8 text-center">
                <div className="max-w-md glass-panel p-12 border-red-500/30">
                    <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-6 animate-pulse" />
                    <h1 className="text-3xl font-medieval text-red-500 mb-4">RESTRICTED REALM</h1>
                    <p className="text-gray-400">You do not have the ancient sigils required to access this chamber.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-6 p-4 sm:p-8 max-w-7xl mx-auto w-full overflow-hidden">
            <header className="flex justify-between items-end border-b border-white/10 pb-6 shrink-0">
                <div>
                    <h1 className="text-4xl font-medieval text-gold mb-2 flex items-center gap-3">
                        <Shield className="text-primary" />
                        Admin Citadel
                    </h1>
                    <p className="text-gray-400 italic">Central command for Argonvale Adventures</p>
                </div>
                <div className="text-right">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">System Health</div>
                    <div className="flex items-center gap-2 text-success font-mono justify-end">
                        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        {stats?.status?.toUpperCase() || 'ACTIVE'}
                    </div>
                </div>
            </header>

            {actionMessage && (
                <div className="bg-success/20 border border-success/30 text-success px-4 py-2 rounded-lg flex items-center gap-2 animate-bounce">
                    <CheckCircle2 size={16} />
                    {actionMessage}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                <div className="glass-panel p-6 border-primary/20 hover:border-primary/40 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <Users className="text-primary group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Registry</span>
                    </div>
                    <div className="text-3xl font-medieval text-white">{users.length}</div>
                </div>
                <div className="glass-panel p-6 border-warning/20 hover:border-warning/40 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <Activity className="text-warning group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Audit Scale</span>
                    </div>
                    <div className="text-3xl font-medieval text-white">{auditLogs.length}</div>
                </div>
                <div className="glass-panel p-6 border-blue-500/20 hover:border-blue-500/40 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <Settings className="text-blue-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sync Engine</span>
                    </div>
                    <div className="text-lg font-mono text-white truncate">{stats?.multiplayer_sync || 'LOCAL'}</div>
                </div>
                <div className="glass-panel p-6 border-gold/20 hover:border-gold/40 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <Hammer className="text-gold group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Version</span>
                    </div>
                    <div className="text-3xl font-medieval text-white">{stats?.version || '1.0.0'}</div>
                </div>
            </div>

            <main className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
                <div className="flex-1 glass-panel p-0 flex flex-col overflow-hidden">
                    <nav className="flex border-b border-white/5 bg-white/2 shrink-0">
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`px-6 py-4 text-xs font-bold uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}
                        >
                            <Users size={14} /> Explorer Registry
                        </button>
                        <button
                            onClick={() => setActiveTab('audit')}
                            className={`px-6 py-4 text-xs font-bold uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all ${activeTab === 'audit' ? 'border-gold text-gold' : 'border-transparent text-gray-500'}`}
                        >
                            <History size={14} /> Audit Trail
                        </button>
                    </nav>

                    <div className="flex-1 overflow-y-auto">
                        {activeTab === 'users' && (
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="sticky top-0 bg-dark z-10 text-gray-500 uppercase text-[10px] font-bold tracking-widest border-b border-white/10">
                                    <tr>
                                        <th className="px-6 py-4">Username</th>
                                        <th className="px-6 py-4">Current Role</th>
                                        <th className="px-6 py-4">Last Position</th>
                                        <th className="px-6 py-4">Management</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-white/2 transition-colors">
                                            <td className="px-6 py-4 font-bold text-white">{u.username}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.role === 'admin' ? 'bg-primary/20 text-primary' :
                                                    u.role === 'moderator' ? 'bg-warning/20 text-warning' : 'bg-white/10 text-gray-400'
                                                    }`}>
                                                    {(u.role || 'user').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-400">
                                                {(u.last_zone_id || 'UNKNOWN').toUpperCase()} ({u.last_x}, {u.last_y})
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    className="bg-dark/40 border border-white/10 rounded px-2 py-1 text-[10px] focus:outline-none focus:border-primary"
                                                    value={u.role || 'user'}
                                                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                >
                                                    <option value="user">USER</option>
                                                    <option value="moderator">MODERATOR</option>
                                                    <option value="admin">ADMIN</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {activeTab === 'audit' && (
                            <div className="p-0">
                                {auditLogs.length === 0 ? (
                                    <div className="p-12 text-center text-gray-500 italic">The scrolls are currently empty.</div>
                                ) : (
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead className="sticky top-0 bg-dark z-10 text-gray-500 uppercase text-[10px] font-bold tracking-widest border-b border-white/10">
                                            <tr>
                                                <th className="px-6 py-4">Timestamp</th>
                                                <th className="px-6 py-4">Admin</th>
                                                <th className="px-6 py-4">Action</th>
                                                <th className="px-6 py-4">Details</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {auditLogs.map(log => (
                                                <tr key={log.id} className="hover:bg-white/2 transition-colors">
                                                    <td className="px-6 py-4 text-gray-400 font-mono text-[10px]">
                                                        {new Date(log.timestamp).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-white">{log.admin_username}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-gold font-bold text-[10px]">{log.action.toUpperCase()}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-gray-300">
                                                        {JSON.stringify(log.changes)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
                    <div className="glass-panel p-6 flex flex-col gap-4">
                        <h2 className="text-xl font-medieval text-gold mb-2 flex items-center gap-2">
                            <Hammer size={18} /> Citadel Forge
                        </h2>
                        <button className="w-full glass-panel border-white/10 p-4 text-left hover:border-primary/50 transition-all flex items-center justify-between group">
                            <span className="text-sm font-bold">Bestiary Management</span>
                            <Settings className="w-4 h-4 text-primary group-hover:rotate-45 transition-transform" />
                        </button>
                        <button className="w-full glass-panel border-white/10 p-4 text-left hover:border-primary/50 transition-all flex items-center justify-between group">
                            <span className="text-sm font-bold">Leyline Cartography</span>
                            <Settings className="w-4 h-4 text-primary group-hover:rotate-45 transition-transform" />
                        </button>
                        <button className="w-full glass-panel border-white/10 p-4 text-left hover:border-red-500/50 transition-all flex items-center justify-between group">
                            <span className="text-sm font-bold text-red-400">Divine Proclamation</span>
                            <AlertCircle className="w-4 h-4 text-red-500" />
                        </button>
                        <div className="mt-4 p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                            <h4 className="text-red-500 text-[10px] font-bold uppercase mb-2">Seal the Realm</h4>
                            <button className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded text-[10px] transition-colors uppercase">MAINTENANCE MODE</button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminView;
