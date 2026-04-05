import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Shield, Users, MessageCircle, Hash, Trash2, ArrowLeft,
  Lock, BarChart3, Key
} from "lucide-react";

export default function Admin() {
  const { API_URL } = useAuth();
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("stats");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [messages, setMessages] = useState([]);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    const res = await fetch(`${API_URL}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (res.ok) {
      setAuthenticated(true);
      fetchAll();
    } else {
      setError(data.error || "Mot de passe incorrect");
    }
  };

  const fetchAll = async () => {
    const [s, u, g, m] = await Promise.all([
      fetch(`${API_URL}/api/admin/stats`).then((r) => r.json()),
      fetch(`${API_URL}/api/admin/users`).then((r) => r.json()),
      fetch(`${API_URL}/api/admin/groups`).then((r) => r.json()),
      fetch(`${API_URL}/api/admin/messages`).then((r) => r.json()),
    ]);
    setStats(s);
    setUsers(u.users || []);
    setGroups(g.groups || []);
    setMessages(m.messages || []);
  };

  const deleteUser = async (id) => {
    if (!confirm("Supprimer cet utilisateur ?")) return;
    await fetch(`${API_URL}/api/admin/users/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const deleteGroup = async (id) => {
    if (!confirm("Supprimer ce groupe ?")) return;
    await fetch(`${API_URL}/api/admin/groups/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const deleteMessage = async (id) => {
    await fetch(`${API_URL}/api/admin/messages/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwMsg("");
    const res = await fetch(`${API_URL}/api/admin/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    const data = await res.json();
    if (res.ok) {
      setPwMsg("Mot de passe modifié !");
      setCurrentPw("");
      setNewPw("");
      setShowChangePassword(false);
    } else {
      setPwMsg(data.error || "Erreur");
    }
  };

  if (!authenticated) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <Shield size={40} color="#ed4245" />
            <h1>Admin MessoChat</h1>
            <p>Entrez le mot de passe admin</p>
          </div>
          <form onSubmit={handleLogin}>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-group">
              <label>Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe admin"
                required
              />
            </div>
            <button type="submit" className="btn-primary">Accéder</button>
          </form>
          <p className="auth-footer">
            <a href="#" onClick={() => navigate("/")}>Retour à MessoChat</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <div className="admin-sidebar">
        <div className="sidebar-header">
          <Shield size={24} color="#ed4245" />
          <span className="sidebar-title">Admin</span>
        </div>
        <div className="admin-nav">
          <button className={`admin-nav-btn ${tab === "stats" ? "active" : ""}`} onClick={() => setTab("stats")}>
            <BarChart3 size={18} /> Statistiques
          </button>
          <button className={`admin-nav-btn ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>
            <Users size={18} /> Utilisateurs
          </button>
          <button className={`admin-nav-btn ${tab === "groups" ? "active" : ""}`} onClick={() => setTab("groups")}>
            <Hash size={18} /> Groupes
          </button>
          <button className={`admin-nav-btn ${tab === "messages" ? "active" : ""}`} onClick={() => setTab("messages")}>
            <MessageCircle size={18} /> Messages
          </button>
          <button className={`admin-nav-btn ${tab === "password" ? "active" : ""}`} onClick={() => setTab("password")}>
            <Key size={18} /> Mot de passe
          </button>
        </div>
        <div className="sidebar-footer">
          <button className="sidebar-btn" onClick={() => navigate("/")}>
            <ArrowLeft size={18} /> Retour
          </button>
        </div>
      </div>

      <div className="admin-content">
        {tab === "stats" && stats && (
          <div className="admin-stats">
            <h2>Statistiques</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <Users size={32} />
                <div className="stat-value">{stats.userCount}</div>
                <div className="stat-label">Utilisateurs</div>
              </div>
              <div className="stat-card">
                <Hash size={32} />
                <div className="stat-value">{stats.groupCount}</div>
                <div className="stat-label">Groupes</div>
              </div>
              <div className="stat-card">
                <MessageCircle size={32} />
                <div className="stat-value">{stats.messageCount}</div>
                <div className="stat-label">Messages</div>
              </div>
              <div className="stat-card">
                <Lock size={32} />
                <div className="stat-value">{stats.pendingRequests}</div>
                <div className="stat-label">Demandes en attente</div>
              </div>
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="admin-table-section">
            <h2>Utilisateurs ({users.length})</h2>
            <table className="admin-table">
              <thead>
                <tr><th>ID</th><th>Username</th><th>Créé le</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.username}</td>
                    <td>{new Date(u.created_at).toLocaleDateString("fr-FR")}</td>
                    <td>
                      <button className="delete-btn" onClick={() => deleteUser(u.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "groups" && (
          <div className="admin-table-section">
            <h2>Groupes ({groups.length})</h2>
            <table className="admin-table">
              <thead>
                <tr><th>ID</th><th>Nom</th><th>Créateur</th><th>Membres</th><th>Créé le</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.id}>
                    <td>{g.id}</td>
                    <td>{g.name}</td>
                    <td>{g.creator_name}</td>
                    <td>{g.member_count}</td>
                    <td>{new Date(g.created_at).toLocaleDateString("fr-FR")}</td>
                    <td>
                      <button className="delete-btn" onClick={() => deleteGroup(g.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "messages" && (
          <div className="admin-table-section">
            <h2>Messages récents (100 derniers)</h2>
            <table className="admin-table">
              <thead>
                <tr><th>ID</th><th>Utilisateur</th><th>Groupe</th><th>Type</th><th>Contenu</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m.id}>
                    <td>{m.id}</td>
                    <td>{m.username}</td>
                    <td>{m.group_name}</td>
                    <td>{m.type}</td>
                    <td className="msg-cell">{m.content?.substring(0, 50)}</td>
                    <td>
                      <button className="delete-btn" onClick={() => deleteMessage(m.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "password" && (
          <div className="admin-password">
            <h2>Changer le mot de passe admin</h2>
            <form onSubmit={changePassword} className="password-form">
              {pwMsg && <div className="info-msg">{pwMsg}</div>}
              <div className="form-group">
                <label>Mot de passe actuel</label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-primary">Modifier</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
