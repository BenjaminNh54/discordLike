import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Plus, LogOut, Search, Users, Crown, Clock, Download, Shield,
  MessageCircle, Hash, ChevronRight
} from "lucide-react";

export default function Home() {
  const { user, token, logout, API_URL } = useAuth();
  const navigate = useNavigate();
  const [myGroups, setMyGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    fetchMyGroups();
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    });
  }, []);

  const fetchMyGroups = async () => {
    const res = await fetch(`${API_URL}/api/groups/my`, { headers });
    const data = await res.json();
    setMyGroups(data.groups || []);
  };

  const fetchAllGroups = async () => {
    const res = await fetch(`${API_URL}/api/groups/all`, { headers });
    const data = await res.json();
    setAllGroups(data.groups || []);
  };

  const createGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    await fetch(`${API_URL}/api/groups`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: groupName, description: groupDesc }),
    });
    setGroupName("");
    setGroupDesc("");
    setShowCreate(false);
    fetchMyGroups();
  };

  const requestJoin = async (groupId) => {
    await fetch(`${API_URL}/api/groups/${groupId}/join`, { method: "POST", headers });
    fetchAllGroups();
  };

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstall(false);
  };

  const filteredGroups = allGroups.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="home-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <MessageCircle size={24} color="#5865f2" />
          <span className="sidebar-title">MessoChat</span>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Mes Groupes</div>
          {myGroups.map((g) => (
            <div
              key={g.id}
              className="sidebar-item"
              onClick={() => navigate(`/chat/${g.id}`)}
            >
              <Hash size={18} />
              <span>{g.name}</span>
              {g.role === "admin" && <Crown size={14} className="role-icon" />}
            </div>
          ))}
          {myGroups.length === 0 && (
            <div className="sidebar-empty">Aucun groupe</div>
          )}
        </div>

        <div className="sidebar-actions">
          <button className="sidebar-btn" onClick={() => setShowCreate(true)}>
            <Plus size={18} /> Créer un groupe
          </button>
          <button className="sidebar-btn" onClick={() => { setShowBrowse(true); fetchAllGroups(); }}>
            <Search size={18} /> Parcourir
          </button>
          {showInstall && (
            <button className="sidebar-btn install-btn" onClick={handleInstallPWA}>
              <Download size={18} /> Installer l'app
            </button>
          )}
          <button className="sidebar-btn" onClick={() => navigate("/admin")}>
            <Shield size={18} /> Admin
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.username?.[0]?.toUpperCase()}</div>
            <span className="user-name">{user?.username}</span>
          </div>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        {!showCreate && !showBrowse && (
          <div className="welcome-screen">
            <MessageCircle size={80} color="#5865f2" />
            <h2>Bienvenue sur MessoChat !</h2>
            <p>Sélectionne un groupe dans la sidebar ou crées-en un nouveau.</p>
            <div className="welcome-actions">
              <button className="btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={18} /> Créer un groupe
              </button>
              <button className="btn-secondary" onClick={() => { setShowBrowse(true); fetchAllGroups(); }}>
                <Search size={18} /> Parcourir les groupes
              </button>
            </div>
          </div>
        )}

        {showCreate && (
          <div className="modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Créer un groupe privé</h2>
              <p className="modal-subtitle">Tu seras l'admin de ce groupe</p>
              <form onSubmit={createGroup}>
                <div className="form-group">
                  <label>Nom du groupe</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Mon super groupe"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description (optionnel)</label>
                  <input
                    type="text"
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    placeholder="De quoi parle ce groupe ?"
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary">Créer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showBrowse && (
          <div className="browse-panel">
            <div className="browse-header">
              <h2>Parcourir les groupes</h2>
              <button className="close-btn" onClick={() => setShowBrowse(false)}>&times;</button>
            </div>
            <div className="search-bar">
              <Search size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un groupe..."
              />
            </div>
            <div className="group-list">
              {filteredGroups.map((g) => (
                <div key={g.id} className="group-card">
                  <div className="group-card-info">
                    <div className="group-card-avatar">
                      <Hash size={24} />
                    </div>
                    <div>
                      <h3>{g.name}</h3>
                      <p>{g.description || "Pas de description"}</p>
                      <div className="group-meta">
                        <Users size={14} /> {g.member_count} membres
                        <span className="separator">·</span>
                        <Crown size={14} /> {g.creator_name}
                      </div>
                    </div>
                  </div>
                  <div className="group-card-action">
                    {g.is_member ? (
                      <button className="btn-secondary" onClick={() => navigate(`/chat/${g.id}`)}>
                        Ouvrir <ChevronRight size={16} />
                      </button>
                    ) : g.has_pending_request ? (
                      <button className="btn-secondary" disabled>
                        <Clock size={16} /> En attente
                      </button>
                    ) : (
                      <button className="btn-primary" onClick={() => requestJoin(g.id)}>
                        Demander à rejoindre
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {filteredGroups.length === 0 && (
                <div className="empty-state">Aucun groupe trouvé</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
