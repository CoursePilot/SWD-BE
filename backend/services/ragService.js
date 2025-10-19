const geminiService = require('./geminiService');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class RAGService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  async searchKnowledgeBase(queryText, limit = 5) {
    try {
      const queryEmbedding = await geminiService.createEmbedding(queryText);

      const { data, error } = await this.supabase.rpc('match_knowledge_base', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit
      });

      if (error) {
        console.error(' Error querying Supabase knowledge base:', error.message);
        return [];
      }

      return data.map(row => ({
        id: row.id,
        content: row.content,
        similarity: row.similarity
      }));

    } catch (error) {
      console.error(' Error searching knowledge base:', error.message);
      return [];
    }
  }

  formatRetrievedContext(chunks) {
    if (!chunks || chunks.length === 0) {
      return 'Không tìm thấy thông tin liên quan trong cơ sở dữ liệu.';
    }

    return chunks.map((chunk, index) => `
[Nguồn ${index + 1}]
${chunk.content}
→ Độ liên quan: ${(chunk.similarity * 100).toFixed(1)}%
---`).join('\n\n');
  }

async addKnowledge({ source_type, source_id, title, content, metadata }) {
    try {
      const embedding = await geminiService.createEmbedding(content);
  
      const { data, error } = await this.supabase
        .from('knowledge_base')
        .insert([
          {
            source_type,
            source_id,
            title,
            content,
            embedding,
            metadata
          }
        ])
        .select('id'); 
  
      if (error) {
        console.error(' Error inserting knowledge base:', error.message);
        throw error;
      }
  
      const insertedId = data?.[0]?.id || null;
  
      return { success: true, id: insertedId };
    } catch (error) {
      console.error(' Error adding knowledge:', error.message);
      throw error;
    }
  }
  

  async deleteKnowledge(id) {
    try {
      const { error } = await this.supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id);

      if (error) {
        console.error(' Error deleting knowledge base:', error.message);
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error(' Error deleting knowledge:', error.message);
      throw error;
    }
  }
}

module.exports = new RAGService();