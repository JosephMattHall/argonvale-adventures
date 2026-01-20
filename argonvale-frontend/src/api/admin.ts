import api from './client';
import type { Profile } from './profiles';

export interface AdminStats {
    status: string;
    version: string;
    multiplayer_sync: string;
}

export interface AuditLogEntry {
    id: number;
    admin_username: string;
    action: string;
    target_type: string;
    target_id: string;
    changes: any;
    timestamp: string;
}

export const fetchAdminStats = async () => {
    const response = await api.get<AdminStats>('/api/admin/stats');
    return response.data;
};

export const fetchAllUsers = async () => {
    const response = await api.get<Profile[]>('/api/admin/users');
    return response.data;
};

export const updateUserRole = async (userId: number, role: string) => {
    const response = await api.post(`/api/admin/users/${userId}/role`, { role });
    return response.data;
};

export const fetchAuditLogs = async () => {
    const response = await api.get<AuditLogEntry[]>('/api/admin/audit');
    return response.data;
};
