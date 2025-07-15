import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [currentView, setCurrentView] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState('joueurs');
  const [gears, setGears] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Auth states
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [newUserData, setNewUserData] = useState({ username: '', password: '', role: 'moderateur' });
  const [suggestionData, setSuggestionData] = useState({
    name: '',
    nickname: '',
    gear_id: '',
    image_url: '',
    description: '',
    category: 'joueurs'
  });

  // Load user data on component mount
  useEffect(() => {
    if (authToken) {
      try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        setUser({ username: payload.username, role: payload.role });
      } catch (e) {
        localStorage.removeItem('authToken');
        setAuthToken(null);
      }
    }
  }, [authToken]);

  // Load gears when category changes
  useEffect(() => {
    if (currentView === 'home') {
      loadGears();
    }
  }, [selectedCategory, currentView]);

  // Load suggestions when admin panel opens
  useEffect(() => {
    if (currentView === 'admin' && user) {
      loadSuggestions();
    }
  }, [currentView, user]);

  const loadGears = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/gears?category=${selectedCategory}`);
      const data = await response.json();
      setGears(data);
    } catch (error) {
      console.error('Erreur lors du chargement des gears:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    if (!authToken) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/suggestions`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Erreur lors du chargement des suggestions:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
      });
      
      if (response.ok) {
        const data = await response.json();
        setAuthToken(data.access_token);
        localStorage.setItem('authToken', data.access_token);
        
        try {
          const payload = JSON.parse(atob(data.access_token.split('.')[1]));
          setUser({ username: payload.username, role: payload.role });
        } catch (e) {
          setUser({ username: loginData.username, role: data.role });
        }
        
        setCurrentView('admin');
        setLoginData({ username: '', password: '' });
        
        // Success animation
        document.body.classList.add('success-flash');
        setTimeout(() => document.body.classList.remove('success-flash'), 1000);
      } else {
        const errorData = await response.json();
        alert(errorData.detail || 'Nom d\'utilisateur ou mot de passe incorrect');
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      alert('Erreur de connexion');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setAuthToken(null);
    setUser(null);
    setCurrentView('home');
  };

  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        showNotification('✅ ID copié dans le presse-papier !', 'success');
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('✅ ID copié dans le presse-papier !', 'success');
      }
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
      showNotification('❌ Impossible de copier: ' + text, 'error');
    }
  };

  const showNotification = (message, type) => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
  };

  const handleSuggestionSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(suggestionData)
      });
      
      if (response.ok) {
        showNotification('🎉 Suggestion soumise avec succès !', 'success');
        setSuggestionData({
          name: '',
          nickname: '',
          gear_id: '',
          image_url: '',
          description: '',
          category: 'joueurs'
        });
      } else {
        showNotification('❌ Erreur lors de la soumission', 'error');
      }
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('❌ Erreur lors de la soumission', 'error');
    }
  };

  const handleApproveSuper = async (suggestionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/suggestions/${suggestionId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.ok) {
        showNotification('✅ Suggestion approuvée et gear créé !', 'success');
        loadSuggestions();
      } else {
        showNotification('❌ Erreur lors de l\'approbation', 'error');
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleRejectSuggestion = async (suggestionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/suggestions/${suggestionId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.ok) {
        showNotification('⚠️ Suggestion rejetée', 'warning');
        loadSuggestions();
      } else {
        showNotification('❌ Erreur lors du rejet', 'error');
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleDeleteGear = async (gearId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce gear ?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/gears/${gearId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.ok) {
        showNotification('🗑️ Gear supprimé avec succès !', 'success');
        loadGears();
      } else {
        showNotification('❌ Erreur lors de la suppression', 'error');
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(newUserData)
      });
      
      if (response.ok) {
        showNotification('👤 Utilisateur créé avec succès !', 'success');
        setNewUserData({ username: '', password: '', role: 'moderateur' });
      } else {
        const errorData = await response.json();
        showNotification(errorData.detail || 'Erreur lors de la création de l\'utilisateur', 'error');
      }
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('❌ Erreur lors de la création de l\'utilisateur', 'error');
    }
  };

  const renderHeader = () => (
    <header className={`header ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="header-content">
        <div className="logo-section">
          <div className="logo-container">
            <img 
              src="https://i.imgur.com/XZWXmBV.png" 
              alt="Center French" 
              className="logo"
            />
            <div className="logo-glow"></div>
          </div>
          <div className="brand-info">
            <h1>Center French</h1>
            <p>Suggestions de Gears Roblox</p>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className="theme-toggle"
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
          >
            {isDarkMode ? '🌞' : '🌙'}
          </button>
          
          {user ? (
            <div className="user-section">
              <div className="user-info">
                <div className="user-avatar">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="user-details">
                  <span className="username">{user.username}</span>
                  <span className="user-role">{user.role}</span>
                </div>
              </div>
              <button onClick={handleLogout} className="logout-btn">
                Déconnexion
              </button>
            </div>
          ) : null}
          
          <button 
            className="mobile-menu-toggle"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            ☰
          </button>
        </div>
      </div>
    </header>
  );

  const renderNavigation = () => (
    <nav className={`navigation ${isDarkMode ? 'dark' : 'light'} ${showMobileMenu ? 'show-mobile' : ''}`}>
      <div className="nav-container">
        <button 
          className={`nav-btn ${currentView === 'home' ? 'active' : ''}`}
          onClick={() => { setCurrentView('home'); setShowMobileMenu(false); }}
        >
          <span className="nav-icon">🏠</span>
          <span>Accueil</span>
        </button>
        
        <button 
          className={`nav-btn ${currentView === 'suggest' ? 'active' : ''}`}
          onClick={() => { setCurrentView('suggest'); setShowMobileMenu(false); }}
        >
          <span className="nav-icon">💡</span>
          <span>Suggestions</span>
        </button>
        
        <button 
          className={`nav-btn ${currentView === 'login' ? 'active' : ''}`}
          onClick={() => { setCurrentView('login'); setShowMobileMenu(false); }}
        >
          <span className="nav-icon">🔐</span>
          <span>Admin</span>
        </button>
        
        {user && (
          <button 
            className={`nav-btn ${currentView === 'admin' ? 'active' : ''}`}
            onClick={() => { setCurrentView('admin'); setShowMobileMenu(false); }}
          >
            <span className="nav-icon">⚙️</span>
            <span>Panel</span>
          </button>
        )}
      </div>
    </nav>
  );

  const renderHero = () => (
    <div className="hero-section">
      <div className="hero-background"></div>
      <div className="hero-content">
        <h2>Découvrez les Gears Roblox</h2>
        <p>Explorez, suggérez et gérez les gears pour Center French</p>
        <div className="hero-stats">
          <div className="stat">
            <span className="stat-number">{gears.length}</span>
            <span className="stat-label">Gears</span>
          </div>
          <div className="stat">
            <span className="stat-number">4</span>
            <span className="stat-label">Catégories</span>
          </div>
          <div className="stat">
            <span className="stat-number">{suggestions.length}</span>
            <span className="stat-label">Suggestions</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCategoryButtons = () => (
    <div className="category-section">
      <h3>Catégories de Gears</h3>
      <div className="category-buttons">
        <button 
          className={`category-btn ${selectedCategory === 'joueurs' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('joueurs')}
        >
          <span className="category-icon">👥</span>
          <span className="category-name">Joueurs</span>
        </button>
        
        <button 
          className={`category-btn ${selectedCategory === 'moderateur' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('moderateur')}
        >
          <span className="category-icon">🛡️</span>
          <span className="category-name">Modérateur</span>
        </button>
        
        <button 
          className={`category-btn ${selectedCategory === 'evenements' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('evenements')}
        >
          <span className="category-icon">🎉</span>
          <span className="category-name">Événements</span>
        </button>
        
        <button 
          className={`category-btn ${selectedCategory === 'interdits' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('interdits')}
        >
          <span className="category-icon">🚫</span>
          <span className="category-name">Interdits</span>
        </button>
      </div>
    </div>
  );

  const renderGearCard = (gear) => (
    <div key={gear.id} className={`gear-card ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="gear-header">
        <div className="gear-image">
          <img src={gear.image_url} alt={gear.name} />
          <div className="gear-overlay"></div>
        </div>
        <div className="gear-badge">
          <span className="gear-id">#{gear.gear_id}</span>
        </div>
      </div>
      
      <div className="gear-body">
        <h3 className="gear-name">{gear.name}</h3>
        <p className="gear-nickname">"{gear.nickname}"</p>
        <p className="gear-description">{gear.description}</p>
        
        <div className="gear-footer">
          <div className="gear-actions">
            {gear.category !== 'interdits' && (
              <button 
                className="action-btn primary"
                onClick={() => copyToClipboard(gear.gear_id)}
              >
                <span className="btn-icon">📋</span>
                <span>Copier ID</span>
              </button>
            )}
            
            {user && user.role !== 'moderateur' && (
              <button 
                className="action-btn danger"
                onClick={() => handleDeleteGear(gear.id)}
              >
                <span className="btn-icon">🗑️</span>
                <span>Supprimer</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="home-view">
      {renderHero()}
      {renderCategoryButtons()}
      
      <div className="gears-section">
        <div className="section-header">
          <h3>
            {selectedCategory === 'joueurs' && '👥 Gears Joueurs'}
            {selectedCategory === 'moderateur' && '🛡️ Gears Modérateur'}
            {selectedCategory === 'evenements' && '🎉 Gears Événements'}
            {selectedCategory === 'interdits' && '🚫 Gears Interdits'}
          </h3>
          <div className="gear-count">{gears.length} gears</div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Chargement des gears...</p>
          </div>
        ) : (
          <div className="gears-grid">
            {gears.map(renderGearCard)}
          </div>
        )}
      </div>
    </div>
  );

  const renderSuggestionForm = () => (
    <div className="suggestion-form-container">
      <div className="form-header">
        <h2>💡 Faire une suggestion</h2>
        <p>Proposez un nouveau gear pour Center French</p>
      </div>
      
      <form onSubmit={handleSuggestionSubmit} className="suggestion-form">
        <div className="form-row">
          <div className="form-group">
            <label>Nom du gear</label>
            <input 
              type="text" 
              value={suggestionData.name}
              onChange={(e) => setSuggestionData({...suggestionData, name: e.target.value})}
              placeholder="Ex: Épée de Cristal"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Surnom</label>
            <input 
              type="text" 
              value={suggestionData.nickname}
              onChange={(e) => setSuggestionData({...suggestionData, nickname: e.target.value})}
              placeholder="Ex: Cristal Blade"
              required
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>ID du gear</label>
            <input 
              type="text" 
              value={suggestionData.gear_id}
              onChange={(e) => setSuggestionData({...suggestionData, gear_id: e.target.value})}
              placeholder="Ex: 123456789"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Catégorie</label>
            <select 
              value={suggestionData.category}
              onChange={(e) => setSuggestionData({...suggestionData, category: e.target.value})}
            >
              <option value="joueurs">👥 Joueurs</option>
              <option value="moderateur">🛡️ Modérateur</option>
              <option value="evenements">🎉 Événements</option>
              <option value="interdits">🚫 Interdits</option>
            </select>
          </div>
        </div>
        
        <div className="form-group">
          <label>URL de l'image</label>
          <input 
            type="url" 
            value={suggestionData.image_url}
            onChange={(e) => setSuggestionData({...suggestionData, image_url: e.target.value})}
            placeholder="https://example.com/image.png"
            required
          />
        </div>
        
        <div className="form-group">
          <label>Description</label>
          <textarea 
            value={suggestionData.description}
            onChange={(e) => setSuggestionData({...suggestionData, description: e.target.value})}
            placeholder="Décrivez le gear et son utilité..."
            required
          />
        </div>
        
        <button type="submit" className="submit-btn">
          <span className="btn-icon">📝</span>
          <span>Soumettre la suggestion</span>
        </button>
      </form>
    </div>
  );

  const renderLoginForm = () => (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>🔐 Connexion Administrateur</h2>
          <p>Accédez au panel d'administration</p>
        </div>
        
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Nom d'utilisateur</label>
            <input 
              type="text" 
              value={loginData.username}
              onChange={(e) => setLoginData({...loginData, username: e.target.value})}
              placeholder="Entrez votre nom d'utilisateur"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Mot de passe</label>
            <input 
              type="password" 
              value={loginData.password}
              onChange={(e) => setLoginData({...loginData, password: e.target.value})}
              placeholder="Entrez votre mot de passe"
              required
            />
          </div>
          
          <button type="submit" className="submit-btn">
            <span className="btn-icon">🔑</span>
            <span>Se connecter</span>
          </button>
        </form>
      </div>
    </div>
  );

  const renderAdminPanel = () => (
    <div className="admin-panel">
      <div className="panel-header">
        <h2>⚙️ Panel Administrateur</h2>
        <div className="admin-stats">
          <div className="admin-stat">
            <span className="stat-value">{suggestions.filter(s => s.status === 'pending').length}</span>
            <span className="stat-label">Suggestions en attente</span>
          </div>
          <div className="admin-stat">
            <span className="stat-value">{gears.length}</span>
            <span className="stat-label">Gears totaux</span>
          </div>
        </div>
      </div>
      
      <div className="admin-sections">
        <div className="suggestions-section">
          <h3>📝 Suggestions en attente</h3>
          {suggestions.filter(s => s.status === 'pending').length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h4>Aucune suggestion en attente</h4>
              <p>Toutes les suggestions ont été traitées</p>
            </div>
          ) : (
            <div className="suggestions-grid">
              {suggestions.filter(s => s.status === 'pending').map(suggestion => (
                <div key={suggestion.id} className={`suggestion-card ${isDarkMode ? 'dark' : 'light'}`}>
                  <div className="suggestion-header">
                    <div className="suggestion-image">
                      <img src={suggestion.image_url} alt={suggestion.name} />
                    </div>
                    <div className="suggestion-badge">
                      <span>#{suggestion.gear_id}</span>
                    </div>
                  </div>
                  
                  <div className="suggestion-body">
                    <h4>{suggestion.name}</h4>
                    <p className="suggestion-nickname">"{suggestion.nickname}"</p>
                    <p className="suggestion-category">
                      <span className="category-label">Catégorie:</span> {suggestion.category}
                    </p>
                    <p className="suggestion-description">{suggestion.description}</p>
                    
                    {user.role !== 'moderateur' && (
                      <div className="suggestion-actions">
                        <button 
                          className="action-btn success"
                          onClick={() => handleApproveSuper(suggestion.id)}
                        >
                          <span className="btn-icon">✅</span>
                          <span>Approuver</span>
                        </button>
                        <button 
                          className="action-btn danger"
                          onClick={() => handleRejectSuggestion(suggestion.id)}
                        >
                          <span className="btn-icon">❌</span>
                          <span>Rejeter</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {user.role !== 'moderateur' && (
          <div className="create-user-section">
            <h3>👤 Créer un utilisateur</h3>
            <form onSubmit={handleCreateUser} className="user-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Nom d'utilisateur</label>
                  <input 
                    type="text" 
                    value={newUserData.username}
                    onChange={(e) => setNewUserData({...newUserData, username: e.target.value})}
                    placeholder="Nom d'utilisateur"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Mot de passe</label>
                  <input 
                    type="password" 
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                    placeholder="Mot de passe"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Rôle</label>
                  <select 
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}
                  >
                    <option value="moderateur">🛡️ Modérateur</option>
                    {user.role === 'createur' && <option value="responsable">👑 Responsable</option>}
                  </select>
                </div>
              </div>
              
              <button type="submit" className="submit-btn">
                <span className="btn-icon">➕</span>
                <span>Créer l'utilisateur</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`app ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      {renderHeader()}
      {renderNavigation()}
      
      <main className="main-content">
        {currentView === 'home' && renderHome()}
        {currentView === 'suggest' && renderSuggestionForm()}
        {currentView === 'login' && renderLoginForm()}
        {currentView === 'admin' && user && renderAdminPanel()}
      </main>
      
      <footer className={`footer ${isDarkMode ? 'dark' : 'light'}`}>
        <div className="footer-content">
          <p>&copy; 2024 Center French. Tous droits réservés.</p>
          <p>Créé avec ❤️ pour la communauté Roblox</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
