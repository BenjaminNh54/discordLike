import { Link } from "react-router-dom";  
import { useAuth } from "../context/AuthContext";  
import { Navigate } from "react-router-dom";  
import { MessageCircle, Users, Mic, Shield, Upload, Zap } from "lucide-react";  
  
export default function Landing() {  
  const { user, loading } = useAuth();  
  
  if (loading) return <div className="loading-screen">Chargement...</div>;  
  if (user) return <Navigate to="/home" />;  
  
  return (  
    <div className="landing-page">  
      <nav className="landing-nav">  
        <div className="landing-nav-brand">  
          <MessageCircle size={28} />  
          <span>MessoChat</span>  
        </div>  
        <div className="landing-nav-links">  
          <Link to="/login" className="btn-secondary">Connexion</Link>  
          <Link to="/register" className="btn-primary">S'inscrire</Link>  
        </div>  
      </nav>  
  
      <section className="landing-hero">  
        <MessageCircle size={64} color="#5865f2" />  
        <h1>Bienvenue sur MessoChat</h1>  
        <p>  
          Une application de messagerie de groupe en temps réel. Créez des groupes,  
          discutez avec vos amis, envoyez des messages vocaux et partagez des fichiers.  
        </p>  
        <div className="landing-hero-actions">  
          <Link to="/register" className="btn-primary">Commencer gratuitement</Link>  
          <Link to="/login" className="btn-secondary">J'ai déjà un compte</Link>  
        </div>  
      </section>  
  
      <section className="landing-features">  
        <div className="feature-card">  
          <Users size={32} color="#5865f2" />  
          <h3>Groupes privés</h3>  
          <p>Créez des groupes et invitez vos amis avec un système de demandes d'adhésion.</p>  
        </div>  
        <div className="feature-card">  
          <Zap size={32} color="#5865f2" />  
          <h3>Temps réel</h3>  
          <p>Messages instantanés avec indicateur de frappe en temps réel.</p>  
        </div>  
        <div className="feature-card">  
          <Mic size={32} color="#5865f2" />  
          <h3>Messages vocaux</h3>  
          <p>Enregistrez et envoyez des messages vocaux directement depuis votre navigateur.</p>  
        </div>  
        <div className="feature-card">  
          <Upload size={32} color="#5865f2" />  
          <h3>Partage de fichiers</h3>  
          <p>Partagez des images, vidéos et fichiers jusqu'à 50 MB.</p>  
        </div>  
        <div className="feature-card">  
          <Shield size={32} color="#5865f2" />  
          <h3>Administration</h3>  
          <p>Panel d'administration complet pour gérer utilisateurs, groupes et messages.</p>  
        </div>  
        <div className="feature-card">  
          <MessageCircle size={32} color="#5865f2" />  
          <h3>Style Discord</h3>  
          <p>Interface sombre et moderne inspirée de Discord, responsive sur mobile.</p>  
        </div>  
      </section>  
  
      <footer className="landing-footer">  
        MessoChat — Messagerie de groupe en temps réel  
      </footer>  
    </div>  
  );  
}
