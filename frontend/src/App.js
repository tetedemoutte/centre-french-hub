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
      // Decode token to get user info (simplified - in production use proper JWT decoding)
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
        
        // Decode token to set user properly
        try {
          const payload = JSON.parse(atob(data.access_token.split('.')[1]));
          setUser({ username: payload.username, role: payload.role });
        } catch (e) {
          setUser({ username: loginData.username, role: data.role });
        }
        
        setCurrentView('admin');
        setLoginData({ username: '', password: '' });
        alert('Connexion réussie !');
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
        alert('ID copié dans le presse-papier !');
      } else {
        // Fallback for older browsers or when clipboard API is not available
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
        alert('ID copié dans le presse-papier !');
      }
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
      alert('Impossible de copier automatiquement. ID: ' + text);
    }
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
        alert('Suggestion soumise avec succès !');
        setSuggestionData({
          name: '',
          nickname: '',
          gear_id: '',
          image_url: '',
          description: '',
          category: 'joueurs'
        });
      } else {
        alert('Erreur lors de la soumission');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la soumission');
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
        alert('Utilisateur créé avec succès !');
        setNewUserData({ username: '', password: '', role: 'moderateur' });
      } else {
        const errorData = await response.json();
        alert(errorData.detail || 'Erreur lors de la création de l\'utilisateur');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création de l\'utilisateur');
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
        alert('Suggestion approuvée et gear créé !');
        loadSuggestions();
      } else {
        alert('Erreur lors de l\'approbation');
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
        alert('Suggestion rejetée');
        loadSuggestions();
      } else {
        alert('Erreur lors du rejet');
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
        alert('Gear supprimé avec succès !');
        loadGears();
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const renderHeader = () => (
    <header className={`header ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="header-content">
        <div className="logo-section">
          <img 
            src="https://i.imgur.com/XZWXmBV.png" 
            alt="Center French" 
            className="logo"
          />
          <h1>Center French - Suggestions Gears</h1>
        </div>
        <div className="header-actions">
          <button 
            className="theme-toggle"
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          {user ? (
            <div className="user-section">
              <span>Bonjour, {user.username} ({user.role})</span>
              <button onClick={handleLogout} className="logout-btn">Déconnexion</button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );

  const renderNavigation = () => (
    <nav className={`navigation ${isDarkMode ? 'dark' : 'light'}`}>
      <button 
        className={currentView === 'home' ? 'active' : ''}
        onClick={() => setCurrentView('home')}
      >
        🏠 Accueil
      </button>
      <button 
        className={currentView === 'suggest' ? 'active' : ''}
        onClick={() => setCurrentView('suggest')}
      >
        💡 Faire une suggestion
      </button>
      <button 
        className={currentView === 'login' ? 'active' : ''}
        onClick={() => setCurrentView('login')}
      >
        🔐 Connexion Admin
      </button>
      {user && (
        <button 
          className={currentView === 'admin' ? 'active' : ''}
          onClick={() => setCurrentView('admin')}
        >
          ⚙️ Panel Admin
        </button>
      )}
    </nav>
  );

  const renderCategoryButtons = () => (
    <div className="category-buttons">
      <button 
        className={selectedCategory === 'joueurs' ? 'active' : ''}
        onClick={() => setSelectedCategory('joueurs')}
      >
        👥 Joueurs
      </button>
      <button 
        className={selectedCategory === 'moderateur' ? 'active' : ''}
        onClick={() => setSelectedCategory('moderateur')}
      >
        🛡️ Modérateur
      </button>
      <button 
        className={selectedCategory === 'evenements' ? 'active' : ''}
        onClick={() => setSelectedCategory('evenements')}
      >
        🎉 Événements
      </button>
      <button 
        className={selectedCategory === 'interdits' ? 'active' : ''}
        onClick={() => setSelectedCategory('interdits')}
      >
        🚫 Interdits
      </button>
    </div>
  );

  const renderGearCard = (gear) => (
    <div key={gear.id} className={`gear-card ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="gear-image">
        <img src={gear.image_url} alt={gear.name} />
      </div>
      <div className="gear-info">
        <h3>{gear.name}</h3>
        <p className="gear-nickname">"{gear.nickname}"</p>
        <p className="gear-id">ID: {gear.gear_id}</p>
        <p className="gear-description">{gear.description}</p>
        <div className="gear-actions">
          {gear.category !== 'interdits' && (
            <button 
              className="copy-btn"
              onClick={() => copyToClipboard(gear.gear_id)}
            >
              📋 Copier ID
            </button>
          )}
          {user && user.role !== 'moderateur' && (
            <button 
              className="delete-btn"
              onClick={() => handleDeleteGear(gear.id)}
            >
              🗑️ Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="home-view">
      <h2>Catégories de Gears</h2>
      {renderCategoryButtons()}
      
      <div className="category-title">
        <h3>
          {selectedCategory === 'joueurs' && '👥 Gears Joueurs'}
          {selectedCategory === 'moderateur' && '🛡️ Gears Modérateur'}
          {selectedCategory === 'evenements' && '🎉 Gears Événements'}
          {selectedCategory === 'interdits' && '🚫 Gears Interdits'}
        </h3>
      </div>

      {loading ? (
        <div className="loading">Chargement...</div>
      ) : (
        <div className="gears-grid">
          {gears.map(renderGearCard)}
        </div>
      )}
    </div>
  );

  const renderSuggestionForm = () => (
    <div className="suggestion-form">
      <h2>💡 Faire une suggestion de gear</h2>
      <form onSubmit={handleSuggestionSubmit}>
        <div className="form-group">
          <label>Nom du gear:</label>
          <input 
            type="text" 
            value={suggestionData.name}
            onChange={(e) => setSuggestionData({...suggestionData, name: e.target.value})}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Surnom:</label>
          <input 
            type="text" 
            value={suggestionData.nickname}
            onChange={(e) => setSuggestionData({...suggestionData, nickname: e.target.value})}
            required
          />
        </div>
        
        <div className="form-group">
          <label>ID du gear:</label>
          <input 
            type="text" 
            value={suggestionData.gear_id}
            onChange={(e) => setSuggestionData({...suggestionData, gear_id: e.target.value})}
            required
          />
        </div>
        
        <div className="form-group">
          <label>URL de l'image:</label>
          <input 
            type="url" 
            value={suggestionData.image_url}
            onChange={(e) => setSuggestionData({...suggestionData, image_url: e.target.value})}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Description:</label>
          <textarea 
            value={suggestionData.description}
            onChange={(e) => setSuggestionData({...suggestionData, description: e.target.value})}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Catégorie:</label>
          <select 
            value={suggestionData.category}
            onChange={(e) => setSuggestionData({...suggestionData, category: e.target.value})}
          >
            <option value="joueurs">Joueurs</option>
            <option value="moderateur">Modérateur</option>
            <option value="evenements">Événements</option>
            <option value="interdits">Interdits</option>
          </select>
        </div>
        
        <button type="submit" className="submit-btn">Soumettre la suggestion</button>
      </form>
    </div>
  );

  const renderLoginForm = () => (
    <div className="login-form">
      <h2>🔐 Connexion Administrateur</h2>
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label>Nom d'utilisateur:</label>
          <input 
            type="text" 
            value={loginData.username}
            onChange={(e) => setLoginData({...loginData, username: e.target.value})}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Mot de passe:</label>
          <input 
            type="password" 
            value={loginData.password}
            onChange={(e) => setLoginData({...loginData, password: e.target.value})}
            required
          />
        </div>
        
        <button type="submit" className="submit-btn">Se connecter</button>
      </form>
      
      <div className="login-info">
        <p><strong>Compte de test:</strong></p>
        <p>Nom d'utilisateur: admin</p>
        <p>Mot de passe: admin123</p>
      </div>
    </div>
  );

  const renderAdminPanel = () => (
    <div className="admin-panel">
      <h2>⚙️ Panel Administrateur</h2>
      
      <div className="admin-sections">
        <div className="suggestions-section">
          <h3>📝 Suggestions en attente</h3>
          {suggestions.filter(s => s.status === 'pending').length === 0 ? (
            <p>Aucune suggestion en attente</p>
          ) : (
            <div className="suggestions-grid">
              {suggestions.filter(s => s.status === 'pending').map(suggestion => (
                <div key={suggestion.id} className={`suggestion-card ${isDarkMode ? 'dark' : 'light'}`}>
                  <div className="suggestion-image">
                    <img src={suggestion.image_url} alt={suggestion.name} />
                  </div>
                  <div className="suggestion-info">
                    <h4>{suggestion.name}</h4>
                    <p className="suggestion-nickname">"{suggestion.nickname}"</p>
                    <p className="suggestion-id">ID: {suggestion.gear_id}</p>
                    <p className="suggestion-category">Catégorie: {suggestion.category}</p>
                    <p className="suggestion-description">{suggestion.description}</p>
                    {user.role !== 'moderateur' && (
                      <div className="suggestion-actions">
                        <button 
                          className="approve-btn"
                          onClick={() => handleApproveSuper(suggestion.id)}
                        >
                          ✅ Approuver
                        </button>
                        <button 
                          className="reject-btn"
                          onClick={() => handleRejectSuggestion(suggestion.id)}
                        >
                          ❌ Rejeter
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
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Nom d'utilisateur:</label>
                <input 
                  type="text" 
                  value={newUserData.username}
                  onChange={(e) => setNewUserData({...newUserData, username: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Mot de passe:</label>
                <input 
                  type="password" 
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Rôle:</label>
                <select 
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}
                >
                  <option value="moderateur">Modérateur</option>
                  {user.role === 'createur' && <option value="responsable">Responsable</option>}
                </select>
              </div>
              
              <button type="submit" className="submit-btn">Créer l'utilisateur</button>
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
    </div>
  );
}

export default App;