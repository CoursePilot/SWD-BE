const { validationResult } = require('express-validator');
const Payment = require('../models/payment.model');
const Subscription = require('../models/subscription.model');
const Plan = require('../models/plan.model');
const Center = require('../models/center.model');
const momoService = require('../services/momoService');

module.exports = {
  createPayment,
  createMomoPayment,
  getAllPayments,
  getPaymentById,
  updatePayment,
  cancelPayment,
  getPaymentsBySubscription,
  momoCallback,
  momoRedirect,
  queryPaymentStatus,
  queryMomoPaymentStatus,
  refundPayment,
  getRevenueStats,
  getExpiringSoonPayments
};

// Tạo payment mới (generic)
async function createPayment(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Dữ liệu không hợp lệ",
        details: errors.array()
      });
    }

    const { subscriptionId, method, extraData } = req.body;

    // Kiểm tra subscription có tồn tại không
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        error: "Subscription không tồn tại"
      });
    }

    // Lấy thông tin plan để tính amount
    const plan = await Plan.findById(subscription.planId);
    if (!plan) {
      return res.status(404).json({
        error: "Plan không tồn tại"
      });
    }

    // Tạo invoice number
    const invoiceNo = `INV_${Date.now()}_${subscription.centerId.slice(-6)}`;

    const paymentId = await Payment.create({
      subscriptionId,
      amount: plan.price,
      method,
      status: 'failed', // Tạm thời failed
      invoiceNo
    });

    const payment = await Payment.findById(paymentId);

    res.status(201).json({
      message: "Tạo payment thành công",
      payment
    });

  } catch (error) {
    console.error("Create payment error:", error);
    res.status(500).json({
      error: "Lỗi server khi tạo payment"
    });
  }
}

// Tạo MoMo payment
async function createMomoPayment(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Dữ liệu không hợp lệ",
        details: errors.array()
      });
    }

    const { planId, centerId, returnUrl, userInfo = {} } = req.body;

    // Kiểm tra plan có tồn tại không
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        error: "Plan không tồn tại"
      });
    }

    // Kiểm tra center có tồn tại không
    const center = await Center.findById(centerId);
    if (!center) {
      return res.status(404).json({
        error: "Center không tồn tại"
      });
    }

    // Tạo subscription mới với status pending
    const { v4: uuidv4 } = require('uuid');
    const subscriptionId = uuidv4();
    
    // Tính ngày hết hạn dựa trên duration của plan
    const endDate = new Date();
    if (plan.duration_type === 'month') {
      endDate.setMonth(endDate.getMonth() + plan.duration_value);
    } else if (plan.duration_type === 'year') {
      endDate.setFullYear(endDate.getFullYear() + plan.duration_value);
    } else if (plan.duration_type === 'day') {
      endDate.setDate(endDate.getDate() + plan.duration_value);
    }

    await Subscription.create({
      id: subscriptionId,
      centerId: centerId,
      planId: planId,
      status: 'cancelled', // Tạm thời cancelled, sẽ chuyển thành active khi thanh toán thành công
      startAt: new Date(),
      endAt: endDate
    });

    // Tạo orderId và invoiceNo
    const orderId = momoService.generateOrderId('MOMO');
    const invoiceNo = `INV_${Date.now()}_${centerId.slice(-6)}`;

    // Tạo payment record trong database
    const paymentId = await Payment.create({
      subscriptionId: subscriptionId,
      amount: plan.price,
      method: 'momo',
      status: 'failed', // Tạm thời failed, sẽ chuyển thành paid khi thanh toán thành công
      invoiceNo: invoiceNo,
      transactionId: orderId
    });

    // Tạo extraData cho MoMo
    const extraData = momoService.createExtraData({
      paymentId,
      subscriptionId,
      centerId,
      planId,
      returnUrl: returnUrl || `${process.env.FRONTEND_URL}/payment/success`
    });

    // Tạo yêu cầu thanh toán MoMo
    const momoResult = await momoService.createPayment({
      orderId,
      amount: plan.price,
      orderInfo: `Thanh toán ${plan.name} cho ${center.name}`,
      extraData,
      userInfo
    });

    if (!momoResult.success) {
      // Xóa payment và subscription nếu tạo MoMo payment thất bại
      await Payment.deleteById(paymentId);
      await Subscription.deleteById(subscriptionId);
      
      return res.status(400).json({
        error: "Không thể tạo yêu cầu thanh toán MoMo",
        details: momoResult.error
      });
    }

    const { resultCode, payUrl, qrCodeUrl } = momoResult.data;

    if (resultCode !== 0) {
      await Payment.deleteById(paymentId);
      await Subscription.deleteById(subscriptionId);
      
      return res.status(400).json({
        error: "MoMo trả về lỗi",
        details: momoResult.data
      });
    }

    res.status(201).json({
      message: "Tạo MoMo payment thành công",
      payment: {
        id: paymentId,
        orderId,
        amount: plan.price,
        planName: plan.name,
        centerName: center.name,
        status: 'failed' // Sẽ chuyển thành 'paid' khi thanh toán thành công
      },
      subscription: {
        id: subscriptionId,
        status: 'cancelled' // Sẽ chuyển thành 'active' khi thanh toán thành công
      },
      momo: {
        payUrl,
        qrCodeUrl,
        orderId
      }
    });

  } catch (error) {
    console.error("Create MoMo payment error:", error);
    res.status(500).json({
      error: "Lỗi server khi tạo MoMo payment"
    });
  }
}

// Lấy tất cả payments với filter và pagination
async function getAllPayments(req, res) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      centerId = null, 
      status = null, 
      method = null 
    } = req.query;

    const result = await Payment.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      centerId,
      status,
      method
    });

    res.json({
      message: "Lấy danh sách payments thành công",
      ...result
    });

  } catch (error) {
    console.error("Get all payments error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy danh sách payments"
    });
  }
}

// Lấy payment theo ID
async function getPaymentById(req, res) {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        error: "Payment không tồn tại"
      });
    }

    res.json({
      message: "Lấy thông tin payment thành công",
      payment
    });

  } catch (error) {
    console.error("Get payment by id error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy thông tin payment"
    });
  }
}

// Cập nhật payment
async function updatePayment(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Dữ liệu không hợp lệ",
        details: errors.array()
      });
    }

    const { paymentId } = req.params;
    const { status, transactionId, invoiceNo } = req.body;

    // Kiểm tra payment có tồn tại không
    const existingPayment = await Payment.findById(paymentId);
    if (!existingPayment) {
      return res.status(404).json({
        error: "Payment không tồn tại"
      });
    }

    const paidAt = status === 'paid' ? new Date() : null;

    const updated = await Payment.updateStatus(paymentId, {
      status,
      transactionId,
      paidAt
    });

    if (!updated) {
      return res.status(404).json({
        error: "Không thể cập nhật payment"
      });
    }

    const payment = await Payment.findById(paymentId);

    res.json({
      message: "Cập nhật payment thành công",
      payment
    });

  } catch (error) {
    console.error("Update payment error:", error);
    res.status(500).json({
      error: "Lỗi server khi cập nhật payment"
    });
  }
}

// Hủy payment
async function cancelPayment(req, res) {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        error: "Payment không tồn tại"
      });
    }

    if (payment.status === 'paid') {
      return res.status(400).json({
        error: "Không thể hủy payment đã hoàn thành"
      });
    }

    const updated = await Payment.updateStatus(paymentId, {
      status: 'cancelled'
    });

    if (!updated) {
      return res.status(404).json({
        error: "Không thể hủy payment"
      });
    }

    res.json({
      message: "Hủy payment thành công"
    });

  } catch (error) {
    console.error("Cancel payment error:", error);
    res.status(500).json({
      error: "Lỗi server khi hủy payment"
    });
  }
}

// Lấy payments theo subscription ID
async function getPaymentsBySubscription(req, res) {
  try {
    const { subscriptionId } = req.params;
    const { page = 1, limit = 10, status = null } = req.query;

    // Kiểm tra subscription có tồn tại không
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        error: "Subscription không tồn tại"
      });
    }

    const result = await Payment.findBySubscriptionId(subscriptionId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });

    res.json({
      message: "Lấy danh sách payments theo subscription thành công",
      subscriptionId,
      ...result
    });

  } catch (error) {
    console.error("Get payments by subscription error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy danh sách payments theo subscription"
    });
  }
}

// MoMo IPN Callback
async function momoCallback(req, res) {
  try {
    console.log('=== MoMo Callback START ===');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Method:', req.method);
    console.log('URL:', req.url);

    const verification = momoService.verifyCallback(req.body);
    
    if (!verification.valid) {
      console.error('MoMo callback verification failed:', verification.error);
      return res.status(400).json({
        resultCode: 97,
        message: verification.error
      });
    }

    const { orderId, transId, resultCode, message, amount } = verification.data;

    // Tìm payment theo orderId (transaction_id)
    const payment = await Payment.findByTransactionId(orderId);
    if (!payment) {
      console.error('Payment not found for orderId:', orderId);
      return res.status(404).json({
        resultCode: 99,
        message: 'Payment not found'
      });
    }

    // Cập nhật trạng thái payment
    let newStatus = 'failed';
    let paidAt = null;

    if (resultCode === 0) {
      newStatus = 'paid'; // Sử dụng ENUM value đúng
      paidAt = new Date();
    } else {
      newStatus = 'failed'; // Giữ nguyên failed cho các lỗi khác
    }

    await Payment.updateByTransactionId(orderId, {
      status: newStatus,
      paidAt
    });

    console.log(`Payment ${payment.id} updated to status: ${newStatus}`);

    // Nếu payment completed, cập nhật subscription status thành active
    if (resultCode === 0 && payment.subscription_id) {
      await Subscription.updateStatus(payment.subscription_id, 'active');
      console.log(`Subscription ${payment.subscription_id} activated (status: active)`);
    }

    res.json({
      resultCode: 0,
      message: 'success'
    });

  } catch (error) {
    console.error("MoMo callback error:", error);
    res.status(500).json({
      resultCode: 99,
      message: 'Internal server error'
    });
  }
}

// MoMo Redirect
async function momoRedirect(req, res) {
  try {
    console.log('MoMo Redirect received:', req.query);

    const { orderId, resultCode, message } = req.query;
    
    // Tìm payment để lấy returnUrl từ extraData
    const payment = await Payment.findByTransactionId(orderId);
    let redirectUrl = `${process.env.FRONTEND_URL}/payment/result`;

    if (payment) {
      // Parse extraData để lấy returnUrl
      try {
        const extraData = momoService.parseExtraData(req.query.extraData);
        if (extraData.returnUrl) {
          redirectUrl = extraData.returnUrl;
        }
      } catch (error) {
        console.error('Failed to parse extraData:', error);
      }
    }

    // Redirect với thông tin kết quả
    const params = new URLSearchParams({
      orderId: orderId || '',
      resultCode: resultCode || '99',
      message: message || 'Unknown error'
    });

    res.redirect(`${redirectUrl}?${params.toString()}`);

  } catch (error) {
    console.error("MoMo redirect error:", error);
    res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
  }
}

// Query payment status
async function queryPaymentStatus(req, res) {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        error: "Payment không tồn tại"
      });
    }

    // Nếu là MoMo payment và chưa paid, query từ MoMo
    if (payment.method === 'momo' && payment.status === 'failed' && payment.transactionId) {
      const requestId = `QUERY_${Date.now()}`;
      const momoResult = await momoService.checkPaymentStatus(payment.transactionId, requestId);
      
      if (momoResult.success && momoResult.data.resultCode === 0) {
        // Cập nhật status nếu có thay đổi từ MoMo
        if (momoResult.data.resultCode === 0 && payment.status !== 'paid') {
          await Payment.updateStatus(paymentId, {
            status: 'paid',
            paidAt: new Date()
          });
        }
      }
    }

    // Lấy lại payment sau khi update
    const updatedPayment = await Payment.findById(paymentId);

    res.json({
      message: "Query payment status thành công",
      payment: updatedPayment
    });

  } catch (error) {
    console.error("Query payment status error:", error);
    res.status(500).json({
      error: "Lỗi server khi query payment status"
    });
  }
}

// Hoàn tiền payment
async function refundPayment(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Dữ liệu không hợp lệ",
        details: errors.array()
      });
    }

    const { paymentId } = req.params;
    const { amount, reason = 'Hoàn tiền theo yêu cầu' } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        error: "Payment không tồn tại"
      });
    }

    if (payment.status !== 'paid') {
      return res.status(400).json({
        error: "Chỉ có thể hoàn tiền payment đã hoàn thành"
      });
    }

    const refundAmount = amount || payment.amount;

    // Nếu là MoMo payment, gọi MoMo refund API
    if (payment.method === 'momo' && payment.transactionId) {
      const momoResult = await momoService.refundPayment({
        orderId: payment.transactionId,
        requestId: payment.transactionId,
        amount: refundAmount,
        description: reason
      });

      if (!momoResult.success) {
        return res.status(400).json({
          error: "Không thể hoàn tiền qua MoMo",
          details: momoResult.error
        });
      }

      if (momoResult.data.resultCode !== 0) {
        return res.status(400).json({
          error: "MoMo từ chối hoàn tiền",
          details: momoResult.data
        });
      }
    }

    // Cập nhật trạng thái payment
    await Payment.updateStatus(paymentId, {
      status: 'refunded'
    });

    res.json({
      message: "Hoàn tiền thành công",
      refundAmount,
      reason
    });

  } catch (error) {
    console.error("Refund payment error:", error);
    res.status(500).json({
      error: "Lỗi server khi hoàn tiền"
    });
  }
}

// Lấy thống kê doanh thu
async function getRevenueStats(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Dữ liệu không hợp lệ",
        details: errors.array()
      });
    }

    const { centerId, startDate, endDate } = req.query;

    const stats = await Payment.getRevenueByCenterId(centerId, {
      startDate,
      endDate
    });

    res.json({
      message: "Lấy thống kê doanh thu thành công",
      centerId,
      period: {
        startDate: startDate || 'Từ đầu',
        endDate: endDate || 'Đến hiện tại'
      },
      stats
    });

  } catch (error) {
    console.error("Get revenue stats error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy thống kê doanh thu"
    });
  }
}

// Lấy payments sắp hết hạn
async function getExpiringSoonPayments(req, res) {
  try {
    const { days = 3, page = 1, limit = 10 } = req.query;

    const result = await Payment.findExpiringSoon({
      days: parseInt(days),
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      message: "Lấy danh sách payments sắp hết hạn thành công",
      expiringIn: `${days} ngày`,
      ...result
    });

  } catch (error) {
    console.error("Get expiring payments error:", error);
    res.status(500).json({
      error: "Lỗi server khi lấy danh sách payments sắp hết hạn"
    });
  }
}

// Query MoMo payment status và cập nhật database
async function queryMomoPaymentStatus(req, res) {
  try {
    const { orderId } = req.params;

    console.log(`=== Query MoMo Payment Status for orderId: ${orderId} ===`);

    // Tìm payment trong database
    const payment = await Payment.findByTransactionId(orderId);
    if (!payment) {
      return res.status(404).json({
        error: "Payment không tồn tại",
        orderId
      });
    }

    console.log(`Found payment: ${payment.id}, current status: ${payment.status}`);

    // Nếu payment đã paid rồi thì không cần query
    if (payment.status === 'paid') {
      return res.json({
        message: "Payment đã được thanh toán",
        payment,
        momoStatus: "PAID"
      });
    }

    // Query status từ MoMo
    const requestId = `${orderId}_QUERY_${Date.now()}`;
    const momoResult = await momoService.checkPaymentStatus(orderId, requestId);

    if (!momoResult.success) {
      return res.status(400).json({
        error: "Không thể query trạng thái từ MoMo",
        details: momoResult.error,
        orderId
      });
    }

    const { resultCode, message, transId, amount } = momoResult.data;
    console.log(`MoMo query result: resultCode=${resultCode}, message=${message}`);

    // Cập nhật payment status dựa trên kết quả từ MoMo
    let newStatus = payment.status;
    let paidAt = payment.paidAt;

    if (resultCode === 0) {
      // Thanh toán thành công
      newStatus = 'paid';
      paidAt = new Date();
      
      await Payment.updateByTransactionId(orderId, {
        status: newStatus,
        paidAt
      });

      console.log(`Payment ${payment.id} updated to status: ${newStatus}`);

      // Cập nhật subscription nếu có
      if (payment.subscription_id) {
        await Subscription.updateStatus(payment.subscription_id, 'active');
        console.log(`Subscription ${payment.subscription_id} activated`);
      }

    } else if (resultCode === 1006) {
      // Giao dịch không tồn tại hoặc đã bị hủy
      newStatus = 'cancelled';
      await Payment.updateByTransactionId(orderId, { status: newStatus });
      console.log(`Payment ${payment.id} marked as cancelled`);
    }

    // Lấy lại payment sau khi cập nhật
    const updatedPayment = await Payment.findByTransactionId(orderId);

    res.json({
      message: "Query trạng thái payment thành công",
      payment: updatedPayment,
      momoQuery: {
        resultCode,
        message,
        transId,
        amount,
        orderId
      }
    });

  } catch (error) {
    console.error("Query MoMo payment status error:", error);
    res.status(500).json({
      error: "Lỗi server khi query trạng thái payment"
    });
  }
}