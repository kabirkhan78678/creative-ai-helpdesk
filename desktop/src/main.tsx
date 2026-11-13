import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { AppContent } from './App';
import { WebSocketProvider } from './context/WebSocketContext';
import { User } from './types';
import './index.css';

const Root = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('creative_ai_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('creative_ai_user');
    setCurrentUser(null);
  };

  return (
    <WebSocketProvider currentUser={currentUser} key={currentUser ? currentUser.id : 'guest'}>
      <AppContent
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
      />
    </WebSocketProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
