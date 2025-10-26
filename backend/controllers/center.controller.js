const Center = require("../models/center.model");
const User = require("../models/user.model");

module.exports = {
  submitCenterRequest,
  getMyCenterRequest,
  updateCenterRequest,
  deleteCenterRequest,
  getAllCenterRequests,
  getCenterRequestById,
  updateCenterRequestStatus,
  getMyCenter,
  updateCenter,
  getAllCenters,
  getCenterById,
  deleteCenter,
};

// Student gửi đơn xin làm trung tâm
async function submitCenterRequest(req, res) {
  try {
    const userId = req.user.id;
    const { name, phone, address, websiteUrl, description, documents } = req.body;
    
    // Kiểm tra xem user đã có request đang pending chưa
    const hasPending = await Center.hasPendingRequest(userId);
    if (hasPending) {
      return res.status(400).json({
        error: "Bạn đã có đơn xin làm trung tâm đang chờ duyệt"
      });
    }

    // Kiểm tra xem user đã là center chưa
    const existingCenter = await Center.findByUserId(userId);
    if (existingCenter && existingCenter.status !== 'pending') {
      return res.status(400).json({
        error: "Bạn đã là trung tâm rồi"
      });
    }

    // Xử lý logo upload nếu có
    let logoUrl = null;
    if (req.files && req.files.logo && req.files.logo[0]) {
      try {
        const supabase = require('../config/supabase');
        const logoFile = req.files.logo[0];
        const fileName = `center-request-${Date.now()}-${logoFile.originalname.replace(/\s+/g, "_")}`;
        const filePath = `center-requests/${userId}/${fileName}`;

        const { data, error } = await supabase.storage
          .from('SWD_image')
          .upload(filePath, logoFile.buffer, {
            contentType: logoFile.mimetype,
            upsert: false
          });

        if (error) {
          console.error("Supabase upload error:", error);
          return res.status(500).json({
            error: "Failed to upload logo"
          });
        }

        const { data: urlData } = supabase.storage
          .from('SWD_image')
          .getPublicUrl(filePath);

        logoUrl = urlData.publicUrl;
      } catch (uploadError) {
        console.error("Logo upload failed:", uploadError);
        return res.status(500).json({
          error: "Logo upload failed"
        });
      }
    }

    // Tạo center request
    const requestId = await Center.createCenterRequest({
      userId,
      name,
      logoUrl,
      phone,
      address,
      websiteUrl,
      description
    });

    const newRequest = await Center.findById(requestId);

    return res.status(201).json({
      message: "Đơn xin làm trung tâm đã được gửi thành công",
      request: newRequest
    });
  } catch (err) {
    console.error("Submit center request error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Lấy đơn xin làm trung tâm của user hiện tại
async function getMyCenterRequest(req, res) {
  try {
    const userId = req.user.id;
    
    const request = await Center.findByUserId(userId);
    if (!request) {
      return res.status(404).json({
        error: "Không tìm thấy đơn xin làm trung tâm"
      });
    }

    return res.status(200).json({
      request
    });
  } catch (err) {
    console.error("Get my center request error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Cập nhật đơn xin làm trung tâm (chỉ khi status = pending)
async function updateCenterRequest(req, res) {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Lấy request hiện tại
    const currentRequest = await Center.findByUserId(userId);
    if (!currentRequest) {
      return res.status(404).json({
        error: "Không tìm thấy đơn xin làm trung tâm"
      });
    }

    if (currentRequest.status !== 'pending') {
      return res.status(400).json({
        error: "Chỉ có thể cập nhật đơn khi đang chờ duyệt"
      });
    }

    // Xử lý logo upload nếu có
    if (req.files && req.files.logo && req.files.logo[0]) {
      try {
        const supabase = require('../config/supabase');
        
        // Xóa logo cũ nếu có
        if (currentRequest.logoUrl) {
          try {
            const urlParts = currentRequest.logoUrl.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const filePath = `center-requests/${userId}/${fileName}`;
            
            await supabase.storage
              .from('SWD_image')
              .remove([filePath]);
          } catch (deleteError) {
            console.log("Could not delete old logo:", deleteError.message);
          }
        }

        // Upload logo mới
        const logoFile = req.files.logo[0];
        const fileName = `center-request-${Date.now()}-${logoFile.originalname.replace(/\s+/g, "_")}`;
        const filePath = `center-requests/${userId}/${fileName}`;

        const { data, error } = await supabase.storage
          .from('SWD_image')
          .upload(filePath, logoFile.buffer, {
            contentType: logoFile.mimetype,
            upsert: false
          });

        if (error) {
          console.error("Supabase upload error:", error);
          return res.status(500).json({
            error: "Failed to upload logo"
          });
        }

        const { data: urlData } = supabase.storage
          .from('SWD_image')
          .getPublicUrl(filePath);

        updates.logoUrl = urlData.publicUrl;
      } catch (uploadError) {
        console.error("Logo upload failed:", uploadError);
        return res.status(500).json({
          error: "Logo upload failed"
        });
      }
    }

    // Cập nhật request
    await Center.updateCenter(currentRequest.id, updates);
    const updatedRequest = await Center.findById(currentRequest.id);

    return res.status(200).json({
      message: "Cập nhật đơn xin làm trung tâm thành công",
      request: updatedRequest
    });
  } catch (err) {
    console.error("Update center request error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Xóa đơn xin làm trung tâm (chỉ khi status = pending)
async function deleteCenterRequest(req, res) {
  try {
    const userId = req.user.id;
    
    const request = await Center.findByUserId(userId);
    if (!request) {
      return res.status(404).json({
        error: "Không tìm thấy đơn xin làm trung tâm"
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        error: "Chỉ có thể xóa đơn khi đang chờ duyệt"
      });
    }

    // Xóa logo nếu có
    if (request.logoUrl) {
      try {
        const supabase = require('../config/supabase');
        const urlParts = request.logoUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `center-requests/${userId}/${fileName}`;
        
        await supabase.storage
          .from('SWD_image')
          .remove([filePath]);
      } catch (deleteError) {
        console.log("Could not delete logo:", deleteError.message);
      }
    }

    await Center.deleteCenterRequest(request.id);

    return res.status(200).json({
      message: "Xóa đơn xin làm trung tâm thành công"
    });
  } catch (err) {
    console.error("Delete center request error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Admin: Lấy tất cả đơn xin làm trung tâm
async function getAllCenterRequests(req, res) {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const result = await Center.findAllWithUser({
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("Get all center requests error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Admin: Lấy đơn xin làm trung tâm theo ID
async function getCenterRequestById(req, res) {
  try {
    const { id } = req.params;
    
    const request = await Center.findByIdWithUser(id);
    if (!request) {
      return res.status(404).json({
        error: "Không tìm thấy đơn xin làm trung tâm"
      });
    }

    return res.status(200).json({
      request
    });
  } catch (err) {
    console.error("Get center request by ID error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Admin: Cập nhật trạng thái đơn xin làm trung tâm (approve/reject)
async function updateCenterRequestStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    
    const request = await Center.findById(id);
    if (!request) {
      return res.status(404).json({
        error: "Không tìm thấy đơn xin làm trung tâm"
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        error: "Đơn này đã được xử lý rồi"
      });
    }

    // Cập nhật status của request
    await Center.updateStatus(id, status, adminNotes);

    let message = "";
    if (status === 'approved') {
      // Cập nhật role của user thành center (role = 2)
      await User.updateRole(request.userId, 2);
      message = "Duyệt đơn xin làm trung tâm thành công";
    } else if (status === 'rejected') {
      message = "Từ chối đơn xin làm trung tâm thành công";
    }

    const updatedRequest = await Center.findById(id);

    return res.status(200).json({
      message,
      request: updatedRequest
    });
  } catch (err) {
    console.error("Update center request status error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Lấy thông tin trung tâm của user hiện tại
async function getMyCenter(req, res) {
  try {
    const userId = req.user.id;
    
    const center = await Center.findByUserId(userId);
    if (!center || center.status === 'pending') {
      return res.status(404).json({
        error: "Bạn chưa phải là trung tâm"
      });
    }

    return res.status(200).json({
      center
    });
  } catch (err) {
    console.error("Get my center error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Cập nhật thông tin trung tâm
async function updateCenter(req, res) {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Lấy center hiện tại
    const currentCenter = await Center.findByUserId(userId);
    if (!currentCenter || currentCenter.status === 'pending') {
      return res.status(404).json({
        error: "Bạn chưa phải là trung tâm"
      });
    }

    // Xử lý logo upload nếu có
    if (req.files && req.files.logo && req.files.logo[0]) {
      try {
        const supabase = require('../config/supabase');
        
        // Xóa logo cũ nếu có
        if (currentCenter.logoUrl) {
          try {
            const urlParts = currentCenter.logoUrl.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const filePath = `centers/${userId}/${fileName}`;
            
            await supabase.storage
              .from('SWD_image')
              .remove([filePath]);
          } catch (deleteError) {
            console.log("Could not delete old logo:", deleteError.message);
          }
        }

        // Upload logo mới
        const logoFile = req.files.logo[0];
        const fileName = `center-${Date.now()}-${logoFile.originalname.replace(/\s+/g, "_")}`;
        const filePath = `centers/${userId}/${fileName}`;

        const { data, error } = await supabase.storage
          .from('SWD_image')
          .upload(filePath, logoFile.buffer, {
            contentType: logoFile.mimetype,
            upsert: false
          });

        if (error) {
          console.error("Supabase upload error:", error);
          return res.status(500).json({
            error: "Failed to upload logo"
          });
        }

        const { data: urlData } = supabase.storage
          .from('SWD_image')
          .getPublicUrl(filePath);

        updates.logoUrl = urlData.publicUrl;
      } catch (uploadError) {
        console.error("Logo upload failed:", uploadError);
        return res.status(500).json({
          error: "Logo upload failed"
        });
      }
    }

    // Cập nhật center
    await Center.updateCenter(currentCenter.id, updates);
    const updatedCenter = await Center.findById(currentCenter.id);

    return res.status(200).json({
      message: "Cập nhật thông tin trung tâm thành công",
      center: updatedCenter
    });
  } catch (err) {
    console.error("Update center error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Lấy tất cả trung tâm (public)
async function getAllCenters(req, res) {
  try {
    const { page = 1, limit = 10, status, verified } = req.query;
    
    const result = await Center.findAllWithUser({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      verified: verified === 'true' ? 1 : verified === 'false' ? 0 : null
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("Get all centers error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Lấy thông tin trung tâm theo ID (public)
async function getCenterById(req, res) {
  try {
    const { id } = req.params;
    
    const center = await Center.findByIdWithUser(id);
    if (!center) {
      return res.status(404).json({
        error: "Không tìm thấy trung tâm"
      });
    }

    return res.status(200).json({
      center
    });
  } catch (err) {
    console.error("Get center by ID error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Admin: Xóa trung tâm (soft delete)
async function deleteCenter(req, res) {
  try {
    const { id } = req.params;
    
    const center = await Center.findById(id);
    if (!center) {
      return res.status(404).json({
        error: "Không tìm thấy trung tâm"
      });
    }

    await Center.deleteCenter(id);

    return res.status(200).json({
      message: "Xóa trung tâm thành công"
    });
  } catch (err) {
    console.error("Delete center error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
