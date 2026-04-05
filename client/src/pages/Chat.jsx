import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client";
import {
  Send, Paperclip, Mic, ArrowLeft, Users, Crown, UserX,
  Check, X, Hash, Image, Film, File, Square, Trash2
} from "lucide-react";

export default function Chat() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user, token, API_URL } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [requests, setRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const typingTimeoutRef = useRef(null);

  const headers = { Authorization: `Bearer ${token}` };
  const jsonHeaders = { ...headers, "Content-Type": "application/json" };

  useEffect(() => {
    fetchGroup();
    fetchMessages();

    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;

    socket.emit("join_group", groupId);

    socket.on("new_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("user_typing", (data) => {
      if (data.groupId === parseInt(groupId)) {
        setTypingUsers((prev) => {
          if (prev.find((u) => u.userId === data.userId)) return prev;
          return [...prev, data];
        });
      }
    });

    socket.on("user_stop_typing", (data) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    });

    return () => {
      socket.emit("leave_group", groupId);
      socket.disconnect();
    };
  }, [groupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchGroup = async () => {
    const res = await fetch(`${API_URL}/api/groups/${groupId}`, { headers });
    const data = await res.json();
    if (data.group) {
      setGroup(data.group);
      setMembers(data.members);
      if (!data.isMember) navigate("/");
    }
  };

  const fetchMessages = async () => {
    const res = await fetch(`${API_URL}/api/messages/${groupId}`, { headers });
    const data = await res.json();
    setMessages(data.messages || []);
  };

  const fetchRequests = async () => {
    const res = await fetch(`${API_URL}/api/groups/${groupId}/requests`, { headers });
    const data = await res.json();
    setRequests(data.requests || []);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    socketRef.current?.emit("send_message", {
      groupId: parseInt(groupId),
      content: newMessage,
      type: "text",
    });

    setNewMessage("");
    socketRef.current?.emit("stop_typing", { groupId: parseInt(groupId) });
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    socketRef.current?.emit("typing", { groupId: parseInt(groupId) });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("stop_typing", { groupId: parseInt(groupId) });
    }, 2000);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_URL}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json();
    if (data.fileUrl) {
      socketRef.current?.emit("send_message", {
        groupId: parseInt(groupId),
        content: file.name,
        type: data.type,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
      });
    }
    fileInputRef.current.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], "vocal.webm", { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${API_URL}/api/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const data = await res.json();
        if (data.fileUrl) {
          socketRef.current?.emit("send_message", {
            groupId: parseInt(groupId),
            content: "Message vocal",
            type: "audio",
            fileUrl: data.fileUrl,
            fileName: "vocal.webm",
          });
        }
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleRequest = async (requestId, action) => {
    await fetch(`${API_URL}/api/groups/${groupId}/requests/${requestId}`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ action }),
    });
    fetchRequests();
    fetchGroup();
  };

  const removeMember = async (userId) => {
    await fetch(`${API_URL}/api/groups/${groupId}/members/${userId}`, {
      method: "DELETE",
      headers,
    });
    fetchGroup();
  };

  const deleteMessage = async (msgId) => {
    await fetch(`${API_URL}/api/messages/${msgId}`, {
      method: "DELETE",
      headers,
    });
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
  };

  const isAdmin = group?.creator_id === user?.id;

  const renderMessage = (msg) => {
    const isOwn = msg.user_id === user?.id;
    const time = new Date(msg.created_at).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div key={msg.id} className={`message ${isOwn ? "own" : ""}`}>
        <div className="message-avatar">
          {msg.username?.[0]?.toUpperCase()}
        </div>
        <div className="message-body">
          <div className="message-header">
            <span className="message-author">{msg.username}</span>
            <span className="message-time">{time}</span>
            {(isOwn || isAdmin) && (
              <button className="msg-delete-btn" onClick={() => deleteMessage(msg.id)}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <div className="message-content">
            {msg.type === "text" && <p>{msg.content}</p>}
            {msg.type === "image" && (
              <img
                src={`${API_URL}${msg.file_url}`}
                alt={msg.file_name}
                className="msg-image"
                onClick={() => window.open(`${API_URL}${msg.file_url}`, "_blank")}
              />
            )}
            {msg.type === "video" && (
              <video controls className="msg-video">
                <source src={`${API_URL}${msg.file_url}`} />
              </video>
            )}
            {msg.type === "audio" && (
              <audio controls className="msg-audio">
                <source src={`${API_URL}${msg.file_url}`} />
              </audio>
            )}
            {msg.type === "file" && (
              <a
                href={`${API_URL}${msg.file_url}`}
                target="_blank"
                rel="noreferrer"
                className="msg-file"
              >
                <File size={18} /> {msg.file_name}
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="chat-layout">
      {/* Chat header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <button className="back-btn" onClick={() => navigate("/")}>
            <ArrowLeft size={20} />
          </button>
          <Hash size={20} />
          <h2>{group?.name}</h2>
        </div>
        <div className="chat-header-right">
          {isAdmin && (
            <button
              className="header-btn"
              onClick={() => { setShowRequests(!showRequests); if (!showRequests) fetchRequests(); }}
            >
              <Crown size={18} /> Demandes
            </button>
          )}
          <button className="header-btn" onClick={() => setShowMembers(!showMembers)}>
            <Users size={18} /> {members.length}
          </button>
        </div>
      </div>

      <div className="chat-body">
        {/* Messages */}
        <div className="messages-area">
          <div className="messages-list">
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </div>

          {typingUsers.length > 0 && (
            <div className="typing-indicator">
              {typingUsers.map((u) => u.username).join(", ")} est en train d'écrire...
            </div>
          )}

          {/* Input bar */}
          <form className="message-input-bar" onSubmit={sendMessage}>
            <button type="button" className="input-btn" onClick={() => fileInputRef.current?.click()}>
              <Paperclip size={20} />
            </button>
            <input ref={fileInputRef} type="file" hidden onChange={handleFileUpload} />
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              placeholder={`Envoyer un message dans #${group?.name || ""}...`}
              className="message-input"
            />
            {isRecording ? (
              <button type="button" className="input-btn recording" onClick={stopRecording}>
                <Square size={20} />
              </button>
            ) : (
              <button type="button" className="input-btn" onClick={startRecording}>
                <Mic size={20} />
              </button>
            )}
            <button type="submit" className="input-btn send-btn">
              <Send size={20} />
            </button>
          </form>
        </div>

        {/* Members sidebar */}
        {showMembers && (
          <div className="members-panel">
            <h3>Membres — {members.length}</h3>
            {members.map((m) => (
              <div key={m.id} className="member-item">
                <div className="member-avatar">{m.username[0].toUpperCase()}</div>
                <div className="member-info">
                  <span className="member-name">{m.username}</span>
                  {m.role === "admin" && <Crown size={12} className="role-badge" />}
                </div>
                {isAdmin && m.id !== user.id && (
                  <button className="member-kick" onClick={() => removeMember(m.id)}>
                    <UserX size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Requests panel */}
        {showRequests && isAdmin && (
          <div className="members-panel">
            <h3>Demandes d'adhésion</h3>
            {requests.length === 0 && <p className="empty-text">Aucune demande</p>}
            {requests.map((r) => (
              <div key={r.id} className="member-item">
                <div className="member-avatar">{r.username[0].toUpperCase()}</div>
                <span className="member-name">{r.username}</span>
                <div className="request-actions">
                  <button className="accept-btn" onClick={() => handleRequest(r.id, "accept")}>
                    <Check size={16} />
                  </button>
                  <button className="reject-btn" onClick={() => handleRequest(r.id, "reject")}>
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
