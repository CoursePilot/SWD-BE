const Category = require("../models/category.model");
const { validationResult } = require("express-validator");

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getCategoriesSimple,
  getCategoriesWithCourses
};

// Tạo category mới (chỉ admin)
async function createCategory(req, res) {
  try {
    // Kiểm tra validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Dữ liệu không hợp lệ",
        details: errors.array()
      });
    }

    const { name } = req.body;

    // Kiểm tra tên category đã tồn tại chưa
    const existingCategory = await Category.findByName(name);
    if (existingCategory) {
      return res.status(400).json({
        error: "Tên danh mục đã tồn tại"
      });
    }

    const categoryId = await Category.create({ name });
    const category = await Category.findById(categoryId);

    res.status(201).json({
      message: "Tạo danh mục thành công",
      category
    });

  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({
      error: "Lỗi server khi tạo danh mục"
    });
  }
}

// Lấy tất cả categories với pagination
async function getAllCategories(req, res) {
  try {
    const {
      page = 1,
      limit = 50,
      search
    } = req.query;

    const result = await Category.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      search
    });

    res.status(200).json({
      message: "Lấy danh sách danh mục thành công",
      ...result
    });

  } catch (error) {
    console.error("Get all categories error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy danh sách danh mục"
    });
  }
}

// Lấy category theo ID
async function getCategoryById(req, res) {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        error: "Danh mục không tồn tại"
      });
    }

    // Lấy số lượng courses trong category này
    const courseCount = await Category.countCourses(id);

    res.status(200).json({
      message: "Lấy thông tin danh mục thành công",
      category: {
        ...category,
        courseCount
      }
    });

  } catch (error) {
    console.error("Get category by ID error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy thông tin danh mục"
    });
  }
}

// Cập nhật category (chỉ admin)
async function updateCategory(req, res) {
  try {
    // Kiểm tra validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Dữ liệu không hợp lệ",
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { name } = req.body;

    // Kiểm tra category tồn tại
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        error: "Danh mục không tồn tại"
      });
    }

    // Kiểm tra tên mới có bị trùng không (loại trừ chính category này)
    const nameExists = await Category.nameExists(name, id);
    if (nameExists) {
      return res.status(400).json({
        error: "Tên danh mục đã tồn tại"
      });
    }

    const updated = await Category.updateById(id, { name });
    if (!updated) {
      return res.status(400).json({
        error: "Cập nhật danh mục thất bại"
      });
    }

    const updatedCategory = await Category.findById(id);

    res.status(200).json({
      message: "Cập nhật danh mục thành công",
      category: updatedCategory
    });

  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({
      error: "Lỗi server khi cập nhật danh mục"
    });
  }
}

// Xóa category (chỉ admin)
async function deleteCategory(req, res) {
  try {
    const { id } = req.params;

    // Kiểm tra category tồn tại
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        error: "Danh mục không tồn tại"
      });
    }

    try {
      const deleted = await Category.deleteById(id);
      if (!deleted) {
        return res.status(400).json({
          error: "Xóa danh mục thất bại"
        });
      }

      res.status(200).json({
        message: "Xóa danh mục thành công"
      });

    } catch (deleteError) {
      if (deleteError.message.includes("đang được sử dụng")) {
        return res.status(400).json({
          error: deleteError.message
        });
      }
      throw deleteError;
    }

  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({
      error: "Lỗi server khi xóa danh mục"
    });
  }
}

// Lấy danh sách categories đơn giản (dùng cho dropdown, select)
async function getCategoriesSimple(req, res) {
  try {
    const categories = await Category.findAllSimple();

    res.status(200).json({
      message: "Lấy danh sách danh mục thành công",
      categories
    });

  } catch (error) {
    console.error("Get categories simple error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy danh sách danh mục"
    });
  }
}

// Lấy categories có courses (dùng cho filter)
async function getCategoriesWithCourses(req, res) {
  try {
    const categories = await Category.findWithCourses();

    res.status(200).json({
      message: "Lấy danh sách danh mục có khóa học thành công",
      categories
    });

  } catch (error) {
    console.error("Get categories with courses error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy danh sách danh mục"
    });
  }
}