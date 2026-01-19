import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UserProvider } from './context/UserContext';
import { NotificationProvider } from './context/NotificationContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GameLayout from './layouts/GameLayout';
import StarterSelection from './features/companions/StarterSelection';

function App() {
    return (
        <AuthProvider>
            <UserProvider>
                <NotificationProvider>
                    <Router>
                        <Routes>
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/register" element={<RegisterPage />} />
                            <Route path="/starter" element={<StarterSelection />} />
                            <Route path="/game/*" element={<GameLayout />} />
                        </Routes>
                    </Router>
                </NotificationProvider>
            </UserProvider>
        </AuthProvider>
    );
}

export default App;
