const SESSIONS_KEY = "placementgpt_chat_sessions";
const LEGACY_KEY = "placementgpt_chat";

export function generateSessionId() {
  return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Get title for session based on first user message
 */
function deriveTitle(messages) {
  const firstUserMsg = messages?.find((m) => m.sender === "user");
  if (!firstUserMsg || !firstUserMsg.text) {
    return "New Conversation";
  }
  const text = firstUserMsg.text.trim();
  if (text.length <= 32) return text;
  return `${text.substring(0, 32)}...`;
}

/**
 * Migrate legacy single chat array if it exists
 */
function migrateLegacyIfNeeded(sessions) {
  try {
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const legacyMsgs = JSON.parse(legacyRaw);
      if (Array.isArray(legacyMsgs) && legacyMsgs.length > 0) {
        const legacyId = generateSessionId();
        const legacySession = {
          id: legacyId,
          title: deriveTitle(legacyMsgs),
          messages: legacyMsgs,
          createdAt: Date.now() - 60000,
          updatedAt: Date.now() - 60000,
        };
        sessions.unshift(legacySession);
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
        localStorage.removeItem(LEGACY_KEY);
      }
    }
  } catch (err) {
    console.error("Failed to migrate legacy chat:", err);
  }
}

/**
 * Retrieve all chat sessions sorted by most recently updated
 */
export function getChatSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    let sessions = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(sessions)) {
      sessions = [];
    }

    migrateLegacyIfNeeded(sessions);

    return sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch (err) {
    console.error("Error reading chat sessions:", err);
    return [];
  }
}

/**
 * Retrieve single chat session by ID
 */
export function getChatSession(id) {
  if (!id) return null;
  const sessions = getChatSessions();
  return sessions.find((s) => s.id === id) || null;
}

/**
 * Save or update a chat session
 */
export function saveChatSession(id, messages) {
  if (!id) return null;
  try {
    const sessions = getChatSessions();
    const existingIndex = sessions.findIndex((s) => s.id === id);

    const now = Date.now();
    const title = deriveTitle(messages);

    let updatedSession;

    if (existingIndex >= 0) {
      updatedSession = {
        ...sessions[existingIndex],
        title: title !== "New Conversation" ? title : sessions[existingIndex].title || "New Conversation",
        messages,
        updatedAt: now,
      };
      sessions[existingIndex] = updatedSession;
    } else {
      updatedSession = {
        id,
        title,
        messages,
        createdAt: now,
        updatedAt: now,
      };
      sessions.unshift(updatedSession);
    }

    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));

    window.dispatchEvent(
      new CustomEvent("chat_history_updated", { detail: { id, session: updatedSession } })
    );

    return updatedSession;
  } catch (err) {
    console.error("Error saving chat session:", err);
    return null;
  }
}

/**
 * Delete a chat session by ID
 */
export function deleteChatSession(id) {
  if (!id) return;
  try {
    const sessions = getChatSessions().filter((s) => s.id !== id);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));

    window.dispatchEvent(
      new CustomEvent("chat_history_updated", { detail: { id, deleted: true } })
    );
  } catch (err) {
    console.error("Error deleting chat session:", err);
  }
}
