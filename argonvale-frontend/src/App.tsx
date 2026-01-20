import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UserProvider } from './context/UserContext';
import { NotificationProvider } from './context/NotificationContext';
import { GameSocketProvider } from './context/GameSocketContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LoginCallback from './pages/LoginCallback';
import StarterSelection from './features/companions/StarterSelection';
import GameLayout from './layouts/GameLayout';
import { AuthGuard } from './components/AuthGuard';

function App() {
    return (
        <AuthProvider>
            <UserProvider>
                <GameSocketProvider>
                    <NotificationProvider>
                        <Router>
                            <Routes>
                                <Route path="/" element={<LandingPage />} />
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/login/callback" element={<LoginCallback />} />
                                <Route path="/register" element={<RegisterPage />} />
                                <Route path="/starter" element={
                                    <AuthGuard>
                                        <StarterSelection />
                                    </AuthGuard>
                                } />
                                <Route path="/game/*" element={
                                    <AuthGuard>
                                        <GameLayout />
                                    </AuthGuard>
                                } />
                            </Routes>
                        </Router>
                    </NotificationProvider>
                </GameSocketProvider>
            </UserProvider>
        </AuthProvider>
    );
}

export default App;
