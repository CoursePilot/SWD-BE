const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();


class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    this.chatModel = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash"
    });

    this.embeddingModel = this.genAI.getGenerativeModel({
      model: "text-embedding-004"
    });

    // Kết nối Supabase
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  async createEmbedding(text) {
    if (!this.embeddingModel) {
      console.warn("⚠️ Embedding model not available, returning dummy embedding");
      return new Array(768).fill(0.1);
    }
    
    try {
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding.values; 
    } catch (err) {
      console.error(" Error creating embedding:", err.message);
      return new Array(768).fill(0.1);
    }
  }

  async insertKnowledgeBase({ source_type, source_id, title, content, metadata }) {
    const embedding = await this.createEmbedding(content);

    const { error } = await this.supabase
      .from('knowledge_base')
      .insert([{ source_type, source_id, title, content, embedding, metadata }]);

    if (error) {
      console.error(" Error inserting knowledge base:", error.message);
      throw error;
    }
  }

  async queryKnowledgeBase(queryText, topK = 3) {
    const queryEmbedding = await this.createEmbedding(queryText);

    const { data, error } = await this.supabase.rpc('match_knowledge_base', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: topK
    });

    if (error) {
      console.error(" Error querying knowledge base:", error.message);
      throw error;
    }

    return data;
  }

  // 🧮 (Hàm hỗ trợ) — bạn cần tạo hàm RPC trong Supabase (ở bước dưới)
  // sẽ dùng để tính cosine similarity nhanh bằng SQL

  // 💬 Sinh phản hồi hội thoại
  async getChatWithContext(userMessage, retrievedContext, conversationHistory = []) {
    // Fallback response nếu Gemini không hoạt động
    if (!this.chatModel) {
      return this.getFallbackResponse(userMessage, retrievedContext);
    }

    const systemPrompt = `Bạn là trợ lý tư vấn trung tâm học tập thân thiện và chính xác.

THÔNG TIN TỪ CƠ SỞ DỮ LIỆU:
${retrievedContext}

HƯỚNG DẪN:
- Chỉ dựa vào thông tin trên để trả lời
- Nếu không có dữ liệu liên quan, nói rằng bạn chưa có thông tin
- Trả lời ngắn gọn, bằng tiếng Việt, thân thiện.`;

    const messages = [
      { role: 'user', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    try {
      const result = await this.chatModel.generateContent({
        contents: messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        })),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800
        }
      });
      return result.response.text();
    } catch (error) {
      console.error(" Error in getChatWithContext:", error.message);
      // Trả về fallback response thay vì throw error
      return "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.";
      
    }
    
   
  }
}

module.exports = new GeminiService();
