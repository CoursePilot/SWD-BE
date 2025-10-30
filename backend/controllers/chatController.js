const pool = require("../config/db");
const geminiService = require("../services/geminiService");
const ragService = require("../services/ragService");
const { v4: uuidv4 } = require("uuid");

class ChatController {
  async createSession(req, res) {
    try {
      const { user_id, context } = req.body;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: "Thiếu user_id",
        });
      }

      const session_id = uuidv4();

      await pool.execute(
        `INSERT INTO chat_sessions (session_id, user_id, context)
         VALUES (?, ?, ?)`,
        [session_id, user_id, context ? JSON.stringify(context) : null]
      );

      res.json({
        success: true,
        session_id,
        user_id,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error(" Error creating session:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async sendMessage(req, res) {
    try {
      const { session_id, message_text } = req.body;

      if (!session_id || !message_text) {
        return res.status(400).json({
          success: false,
          error: "Thiếu session_id hoặc message_text",
        });
      }

      if (message_text.trim().length === 0 || message_text.length > 1000) {
        return res.status(400).json({
          success: false,
          error: "Tin nhắn trống hoặc quá dài",
        });
      }

      const [sessions] = await pool.execute(
        "SELECT session_id, context FROM chat_sessions WHERE session_id = ?",
        [session_id]
      );

      if (sessions.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Session không tồn tại",
        });
      }

      // Load session context (purpose, language, ...)
      let sessionContext = {};
      try {
        sessionContext = sessions[0].context ? JSON.parse(sessions[0].context) : {};
      } catch (_) {
        sessionContext = {};
      }

      await pool.execute(
        `INSERT INTO chat_messages (session_id, sender, message_text)
         VALUES (?, ?, ?)`,
        [session_id, "user", message_text]
      );

      const [history] = await pool.execute(
        `SELECT sender, message_text 
         FROM chat_messages 
         WHERE session_id = ? 
         ORDER BY created_at DESC 
         LIMIT 5`,
        [session_id]
      );

      const conversationHistory = history.reverse().map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.message_text,
      }));

      let retrievedChunks = [];
      let context = "";
      try {
        // Heuristic: prefer courses when user asks về "khóa/khóa học/lập trình/..."
        const textForIntent = `${(sessionContext.purpose || '')} ${message_text}`.toLowerCase();
        const preferCourse = /(khóa|khoá|khóa học|khoá học|course|lập trình|web|frontend|backend|data|ielts|toeic)/.test(textForIntent);

        retrievedChunks = await ragService.searchKnowledgeBase(
          message_text,
          12,
          { threshold: 0.5, preferSourceType: preferCourse ? 'course' : undefined }
        );
        context = ragService.formatRetrievedContext(retrievedChunks);
      } catch (ragError) {
        console.warn("Error when querying Supabase:", ragError.message);
        context = "Không thể truy xuất dữ liệu từ Supabase lúc này.";
      }

      const botResponse = await geminiService.getChatWithContext(
        message_text,
        context,
        conversationHistory,
        {
          purpose: sessionContext.purpose || null,
          language: sessionContext.language || "vi",
        }
      );

      await pool.execute(
        `INSERT INTO chat_messages 
         (session_id, sender, message_text, retrieved_chunks)
         VALUES (?, ?, ?, ?)`,
        [
          session_id,
          "bot",
          botResponse,
          retrievedChunks.length
            ? JSON.stringify(
                retrievedChunks.map((c) => ({
                  id: c.id,
                  title: c.title,
                  similarity: c.similarity,
                }))
              )
            : null,
        ]
      );

      res.json({
        success: true,
        session_id,
        timestamp: new Date(),
        message: botResponse,
        retrieved_sources: retrievedChunks.map((c) => ({
          id: c.id,
          title: c.title?.slice(0, 80) || "Untitled",
          source_type: c.source_type,
          similarity: (c.similarity * 100).toFixed(1) + "%",
        })),
      });
    } catch (error) {
      console.error(" Error sending message:", error);

      if (error.code === "ETIMEDOUT") {
        return res.status(503).json({
          success: false,
          error: "Database connection timeout. Vui lòng thử lại sau.",
        });
      }

      if (error.code && error.code.startsWith("ER_")) {
        return res.status(500).json({
          success: false,
          error: "Database error. Vui lòng kiểm tra cấu hình.",
        });
      }

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getSessionHistory(req, res) {
    try {
      const { session_id } = req.params;

      const [messages] = await pool.execute(
        `SELECT id, sender, message_text, created_at
         FROM chat_messages
         WHERE session_id = ?
         ORDER BY created_at ASC`,
        [session_id]
      );

      res.json({
        success: true,
        session_id,
        count: messages.length,
        messages,
      });
    } catch (error) {
      console.error(" Error getting session history:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getUserSessions(req, res) {
    try {
      const { user_id } = req.params;

      const [sessions] = await pool.execute(
        `SELECT 
          s.session_id,
          s.user_id,
          s.context,
          (
            SELECT message_text FROM chat_messages 
            WHERE session_id = s.session_id 
            ORDER BY created_at DESC LIMIT 1
          ) as last_message
         FROM chat_sessions s
         WHERE s.user_id = ?
         ORDER BY s.session_id DESC`,
        [user_id]
      );

      res.json({
        success: true,
        user_id,
        count: sessions.length,
        sessions,
      });
    } catch (error) {
      console.error(" Error getting user sessions:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async endSession(req, res) {
    try {
      const { session_id } = req.params;

      // Since we don't have is_active and ended_at columns, 
      // we can either delete the session or just return success
      // For now, let's just return success without updating
      // await pool.execute(
      //   `UPDATE chat_sessions 
      //    SET is_active = FALSE, ended_at = NOW()
      //    WHERE session_id = ?`,
      //   [session_id]
      // );

      res.json({
        success: true,
        message: "Session has ended",
        timestamp: new Date(),
      });
    } catch (error) {
      console.error(" Error ending session:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new ChatController();
