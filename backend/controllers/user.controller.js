const User = require("../models/user.model");

module.exports = {
  getAllUsers,
  deleteUser,
};

// Admin: Lấy tất cả users với phân trang và lọc
async function getAllUsers(req, res) {
  try {
    const { page = 1, limit = 10, role, emailVerified, search } = req.query;
    
    const result = await User.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      role: role ? parseInt(role) : null,
      emailVerified: emailVerified === 'true' ? 1 : emailVerified === 'false' ? 0 : null,
      search
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("Get all users error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}


// Admin: Xóa user (soft delete)
async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        error: "Không tìm thấy user"
      });
    }

    // Không cho phép xóa chính mình
    if (id === req.user.id) {
      return res.status(400).json({
        error: "Không thể xóa chính mình"
      });
    }

    await User.deleteUser(id);

    return res.status(200).json({
      message: "Xóa user thành công"
    });
  } catch (err) {
    console.error("Delete user error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

