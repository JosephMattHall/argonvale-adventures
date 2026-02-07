import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { profilesApi } from '../api/profiles';
import type { Profile } from '../api/profiles';
import { useAuth } from './AuthContext';

interface UserContextType {
    profile: Profile | null;
    loading: boolean;
    refreshProfile: () => Promise<void>;
    updateProfile: (profile: Profile) => void;
}

const UserContext = createContext<UserContextType | null>(null);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, logout } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshProfile = useCallback(async () => {
        if (!isAuthenticated) {
            setProfile(null);
            setLoading(false);
            return;
        }

        try {
            const data = await profilesApi.getMyProfile();
            setProfile(data);
        } catch (error: any) {
            console.error('Failed to load user profile:', error);
            // If token is invalid/expired, logout automatically
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                logout();
            }
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, logout]);

    useEffect(() => {
        refreshProfile();
    }, [refreshProfile]);

    const updateProfile = (newProfile: Profile) => {
        setProfile(newProfile);
    };

    return (
        <UserContext.Provider value={{ profile, loading, refreshProfile, updateProfile }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
