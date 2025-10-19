const crypto = require('crypto');
const axios = require('axios');

// MoMo API Configuration
const MOMO_CONFIG = {
  partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
  accessKey: process.env.MOMO_ACCESS_KEY || '',
  secretKey: process.env.MOMO_SECRET_KEY || '',
  endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
  redirectUrl: process.env.MOMO_REDIRECT_URL || 'https://studyportal.up.railway.app/api/v1/payments/momo/redirect',
  ipnUrl: process.env.MOMO_IPN_URL || 'https://studyportal.up.railway.app/api/v1/payments/momo/callback',
  requestType: 'payWithATM',
  lang: 'vi'
};

// Tạo chữ ký MoMo
function createSignature(rawData, secretKey) {
  return crypto
    .createHmac('sha256', secretKey)
    .update(rawData)
    .digest('hex');
}

// Tạo yêu cầu thanh toán MoMo
async function createPayment({
  orderId,
  amount,
  orderInfo,
  extraData = '',
  userInfo = {}
}) {
  try {
    const requestId = `${MOMO_CONFIG.partnerCode}_${Date.now()}`;
    
    // Đảm bảo amount là integer (không có decimal)
    const intAmount = Math.round(parseFloat(amount));
    
    // Tạo raw signature
    const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&amount=${intAmount}&extraData=${extraData}&ipnUrl=${MOMO_CONFIG.ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${MOMO_CONFIG.partnerCode}&redirectUrl=${MOMO_CONFIG.redirectUrl}&requestId=${requestId}&requestType=${MOMO_CONFIG.requestType}`;
    
    const signature = createSignature(rawSignature, MOMO_CONFIG.secretKey);

    const requestBody = {
      partnerCode: MOMO_CONFIG.partnerCode,
      accessKey: MOMO_CONFIG.accessKey,
      requestId: requestId,
      amount: intAmount, // Sử dụng integer amount
      orderId: orderId,
      orderInfo: orderInfo,
      redirectUrl: MOMO_CONFIG.redirectUrl,
      ipnUrl: MOMO_CONFIG.ipnUrl,
      extraData: extraData,
      requestType: MOMO_CONFIG.requestType,
      signature: signature,
      lang: MOMO_CONFIG.lang
      // Remove userInfo từ request body chính
    };

    console.log('MoMo Request:', JSON.stringify(requestBody, null, 2));

    const response = await axios.post(MOMO_CONFIG.endpoint, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 seconds timeout
    });

    console.log('MoMo Response:', JSON.stringify(response.data, null, 2));

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    console.error('MoMo Payment Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Xác thực callback từ MoMo
function verifyCallback(requestBody) {
  try {
    const {
      partnerCode,
      accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature
    } = requestBody;

    // Tạo raw signature để xác thực
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
    
    const expectedSignature = createSignature(rawSignature, MOMO_CONFIG.secretKey);

    if (signature !== expectedSignature) {
      console.error('MoMo Signature Verification Failed');
      console.error('Expected:', expectedSignature);
      console.error('Received:', signature);
      return {
        valid: false,
        error: 'Invalid signature'
      };
    }

    return {
      valid: true,
      data: {
        orderId,
        transId,
        resultCode: parseInt(resultCode),
        message,
        amount: parseInt(amount),
        responseTime,
        extraData: extraData || '{}'
      }
    };

  } catch (error) {
    console.error('MoMo Callback Verification Error:', error);
    return {
      valid: false,
      error: error.message
    };
  }
}

// Kiểm tra trạng thái thanh toán
async function checkPaymentStatus(orderId, requestId) {
  try {
    const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&orderId=${orderId}&partnerCode=${MOMO_CONFIG.partnerCode}&requestId=${requestId}`;
    const signature = createSignature(rawSignature, MOMO_CONFIG.secretKey);

    const requestBody = {
      partnerCode: MOMO_CONFIG.partnerCode,
      accessKey: MOMO_CONFIG.accessKey,
      requestId: requestId,
      orderId: orderId,
      signature: signature,
      lang: MOMO_CONFIG.lang
    };

    // MoMo Query endpoint
    const queryEndpoint = process.env.MOMO_QUERY_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/query';

    const response = await axios.post(queryEndpoint, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    console.error('MoMo Query Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Hoàn tiền MoMo
async function refundPayment({
  orderId,
  requestId,
  amount,
  description = 'Hoàn tiền'
}) {
  try {
    const refundRequestId = `${MOMO_CONFIG.partnerCode}_REFUND_${Date.now()}`;
    
    const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&amount=${amount}&description=${description}&orderId=${orderId}&partnerCode=${MOMO_CONFIG.partnerCode}&requestId=${refundRequestId}&transId=${requestId}`;
    const signature = createSignature(rawSignature, MOMO_CONFIG.secretKey);

    const requestBody = {
      partnerCode: MOMO_CONFIG.partnerCode,
      accessKey: MOMO_CONFIG.accessKey,
      requestId: refundRequestId,
      amount: amount,
      orderId: orderId,
      transId: requestId,
      description: description,
      signature: signature,
      lang: MOMO_CONFIG.lang
    };

    // MoMo Refund endpoint
    const refundEndpoint = process.env.MOMO_REFUND_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/refund';

    const response = await axios.post(refundEndpoint, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    console.error('MoMo Refund Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Utility function để tạo orderId unique
function generateOrderId(prefix = 'ORDER') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}_${timestamp}_${random}`;
}

// Utility function để parse extraData
function parseExtraData(extraDataString) {
  try {
    return JSON.parse(extraDataString || '{}');
  } catch (error) {
    console.error('Failed to parse extraData:', error);
    return {};
  }
}

// Utility function để tạo extraData
function createExtraData(data) {
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.error('Failed to create extraData:', error);
    return '{}';
  }
}

module.exports = {
  createPayment,
  verifyCallback,
  checkPaymentStatus,
  refundPayment,
  generateOrderId,
  parseExtraData,
  createExtraData,
  MOMO_CONFIG
};