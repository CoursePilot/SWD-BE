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

  async searchKnowledgeBase(queryText, limit = 5, options = {}) {
    try {
      const queryEmbedding = await geminiService.createEmbedding(queryText);

      const { data, error } = await this.supabase.rpc('match_knowledge_base', {
        query_embedding: queryEmbedding,
        match_threshold: options.threshold ?? 0.6,
        match_count: limit
      });

      if (error) {
        console.error(' Error querying Supabase knowledge base:', error.message);
        return [];
      }

      // Fallback to simple text search if vector search returns no rows
      if (!data || data.length === 0) {
        // Tokenize query to improve partial matching
        const raw = (queryText || '').toLowerCase();
        const tokens = Array.from(new Set(raw.split(/[^\p{L}\p{N}]+/u).filter(t => t && t.length >= 2)));
        const topTokens = tokens.sort((a,b)=>b.length-a.length).slice(0,3);
        const parts = topTokens.flatMap(t => [`title.ilike.%${t}%`, `content.ilike.%${t}%`]);
        const orExpr = parts.length ? parts.join(',') : `title.ilike.%${raw}%,content.ilike.%${raw}%`;

        let q = this.supabase
          .from('knowledge_base')
          .select('id, title, source_type, content')
            .or(orExpr)
          .limit(limit);
        if (options.preferSourceType) {
          q = q.eq('source_type', options.preferSourceType);
        }
        const { data: tdata, error: terr } = await q;
        if (!terr && Array.isArray(tdata) && tdata.length) {
          const score = (doc) => {
            const hay = `${doc.title || ''} ${doc.content || ''}`.toLowerCase();
            const hayTokens = new Set(hay.split(/[^\p{L}\p{N}]+/u).filter(t => t));
            const overlap = tokens.filter(t => hayTokens.has(t)).length;
            if (tokens.length === 0) return 0.5;
            // Map overlap ratio to [0.45, 0.75] to keep under vector scores
            const ratio = overlap / tokens.length;
            return Math.max(0.45, Math.min(0.75, 0.45 + ratio * 0.3));
          };
          return tdata.map(r => ({
            id: r.id,
            title: r.title || null,
            source_type: r.source_type || null,
            content: r.content,
            similarity: score(r)
          }));
        }
      }

      // Enrich results with title and source_type
      const ids = (data || []).map(row => row.id).filter(Boolean);
      let metaMap = new Map();
      if (ids.length) {
        const { data: metaRows, error: metaError } = await this.supabase
          .from('knowledge_base')
          .select('id, title, source_type')
          .in('id', ids);
        if (!metaError && Array.isArray(metaRows)) {
          metaRows.forEach(r => metaMap.set(r.id, { title: r.title, source_type: r.source_type }));
        }
      }

      let enriched = data.map(row => {
        const meta = metaMap.get(row.id) || {};
        return {
          id: row.id,
          title: meta.title || null,
          source_type: meta.source_type || null,
          content: row.content,
          similarity: row.similarity,
        };
      });

      // Optional re-ranking to prefer specific source_type first
      if (options.preferSourceType) {
        const prefer = options.preferSourceType;
        enriched = enriched.sort((a, b) => {
          const ap = a.source_type === prefer ? 1 : 0;
          const bp = b.source_type === prefer ? 1 : 0;
          if (ap !== bp) return bp - ap; // preferred first
          return (b.similarity || 0) - (a.similarity || 0);
        });

        // If no items of preferred type found, run a small textual fallback to surface them
        const hasPreferred = enriched.some(r => r.source_type === prefer);
        if (!hasPreferred) {
          const raw = (queryText || '').toLowerCase();
          const tokens = Array.from(new Set(raw.split(/[^\p{L}\p{N}]+/u).filter(t => t && t.length >= 2)));
          const topTokens = tokens.sort((a,b)=>b.length-a.length).slice(0,3);
          const parts = topTokens.flatMap(t => [`title.ilike.%${t}%`, `content.ilike.%${t}%`]);
          const orExpr = parts.length ? parts.join(',') : `title.ilike.%${raw}%,content.ilike.%${raw}%`;
          const { data: tdata, error: terr } = await this.supabase
            .from('knowledge_base')
            .select('id, title, source_type, content')
            .eq('source_type', prefer)
            .or(orExpr)
            .limit(Math.max(3, Math.floor(limit / 2)));
          if (!terr && Array.isArray(tdata) && tdata.length) {
            const score = (doc) => {
              const hay = `${doc.title || ''} ${doc.content || ''}`.toLowerCase();
              const hayTokens = new Set(hay.split(/[^\p{L}\p{N}]+/u).filter(t => t));
              const overlap = tokens.filter(t => hayTokens.has(t)).length;
              if (tokens.length === 0) return 0.5;
              const ratio = overlap / tokens.length;
              return Math.max(0.45, Math.min(0.75, 0.45 + ratio * 0.3));
            };
            const fallback = tdata.map(r => ({
              id: r.id,
              title: r.title || null,
              source_type: r.source_type || null,
              content: r.content,
              similarity: score(r)
            }));
            enriched = [...fallback, ...enriched].slice(0, limit);
          }
        }
      }

      return enriched;

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
[Nguồn ${index + 1}] ${chunk.title ? `- ${chunk.title}` : ''}
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