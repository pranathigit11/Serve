import '../api/api_service.dart';

class PaymentService {
  Future<Map<String, dynamic>> createPaymentSession(String orderId, String studentId) async {
    final response = await ApiService.post('/payments/create', {
      'orderId': orderId,
      'studentId': studentId,
    });
    
    if (response != null) {
      return response as Map<String, dynamic>;
    } else {
      throw Exception('Failed to create payment session');
    }
  }

  Future<bool> verifyPayment(String paymentId, bool success) async {
    final response = await ApiService.post('/payments/verify', {
      'paymentId': paymentId,
      'success': success,
    });
    
    if (response != null) {
      return response['status'] == 'SUCCESS';
    } else {
      return false;
    }
  }

  // Prepared for future Razorpay integration
  Future<bool> processMockUpiPayment(double amount) async {
    // Simulate payment gateway delay
    await Future.delayed(const Duration(seconds: 2));
    // Always succeed in mock
    return true;
  }
}
