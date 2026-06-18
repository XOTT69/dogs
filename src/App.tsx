import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DiaryPage from './pages/DiaryPage';
import CoursesPage from './pages/CoursesPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import './index.css';

const Header: React.FC = () => (
  <header className="header">
    <div className="header-left">
      <div className="avatar">🐕</div>
      <div>
        <h2 className="header-title">PawPal</h2>
        <span className="header-meta">🐾</span>
      </div>
    </div>
  </header>
);

const BottomNav: React.FC = () => {
  const loc = useLocation();
  const cls = (p: string) => 'nav-item' + (loc.pathname === p ? ' active' : '');
  return (
    <nav className="nav">
      <Link to="/" className={cls('/')}><span>🏠</span><span>Дім</span></Link>
      <Link to="/diary" className={cls('/diary')}><span>📈</span><span>Щоденник</span></Link>
      <Link to="/courses" className={cls('/courses')}><span>🎓</span><span>Навчання</span></Link>
      <Link to="/chat" className={cls('/chat')}><span>💬</span><span>Чат</span></Link>
      <Link to="/profile" className={cls('/profile')}><span>👤</span><span>Профіль</span></Link>
    </nav>
  );
};

const App: React.FC = () => (
  <div className="app">
    <Header />
    <main className="main">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/diary" element={<DiaryPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </main>
    <BottomNav />
  </div>
);

export default App;