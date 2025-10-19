const ragService = require('../services/ragService');

class KnowledgeController {
  async addKnowledge(req, res) {
    try {
      const { source_type, source_id, title, content, metadata } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          error: 'Content là bắt buộc',
        });
      }
      const titleFixed = title || (content ? content.slice(0, 50) + "..." : "Untitled");

      const result = await ragService.addKnowledge({
        source_type,
        source_id,
        title: titleFixed,
        content,
        metadata,
      });

      res.json({
        success: true,
        message: 'Đã thêm knowledge thành công',
        id: result?.id || null,
      });
    } catch (error) {
      console.error(' Error adding knowledge:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async bulkAddKnowledge(req, res) {
    try {
      const { items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Items phải là array và không được rỗng',
        });
      }

      const results = [];
      for (const item of items) {
        try {
          const result = await ragService.addKnowledge(item);
          results.push({ success: true, id: result?.id || null });
        } catch (err) {
          results.push({ success: false, error: err.message });
        }
      }

      const successCount = results.filter((r) => r.success).length;

      res.json({
        success: true,
        total: items.length,
        successful: successCount,
        results,
      });
    } catch (error) {
      console.error(' Error bulk adding knowledge:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async searchKnowledge(req, res) {
    try {
      const { query, limit } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Query là bắt buộc',
        });
      }

      const results = await ragService.searchKnowledgeBase(query, limit || 5);

      res.json({
        success: true,
        count: results.length,
        results: results.map((r) => ({
          id: r.id,
          title: r.title || '(Không tiêu đề)',
          content: r.content?.slice(0, 200) + '...',
          source_type: r.source_type,
          similarity: (r.similarity * 100).toFixed(1) + '%',
        })),
      });
    } catch (error) {
      console.error(' Error searching knowledge:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getKnowledgeList(req, res) {
    try {
      const { source_type, limit, offset } = req.query;
      const limitNum = parseInt(limit) || 20;
      const offsetNum = parseInt(offset) || 0;

      let query = ragService.supabase
        .from('knowledge_base')
        .select('id, source_type, source_id, title, content, created_at')
        .order('created_at', { ascending: false })
        .range(offsetNum, offsetNum + limitNum - 1);

      if (source_type) query = query.eq('source_type', source_type);

      const { data, error } = await query;

      if (error) throw error;

      res.json({
        success: true,
        count: data.length,
        knowledge: data.map((item) => ({
          ...item,
          content_preview: item.content?.slice(0, 200) || '',
        })),
      });
    } catch (error) {
      console.error('Error getting knowledge list:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async deleteKnowledge(req, res) {
    try {
      const { id } = req.params;

      await ragService.deleteKnowledge(id);

      res.json({
        success: true,
        message: 'Đã xóa knowledge thành công',
      });
    } catch (error) {
      console.error('Error deleting knowledge:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new KnowledgeController();