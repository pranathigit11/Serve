import '../../models/order.dart';
import '../api/api_client.dart';

/// Mock payment flow. The server creates the payment, the simulated gateway
/// returns a server-signed result, and only the server's verification marks
/// the order as paid. The app never decides that a payment succeeded.
class PaymentService {
  final ApiClient _api = ApiClient.instance;

  Future<AppOrder> payForOrder(String orderId) async {
    final paymentBody = await _api.post('/api/payments', {'orderId': orderId});
    final payment = paymentBody['payment'] as Map<String, dynamic>;
    final paymentId = payment['id'] as String;

    // Simulated UPI gateway (stands in for the Razorpay checkout sheet).
    final gatewayBody = await _api.post('/api/payments/mock/$paymentId/complete', {'outcome': 'SUCCESS'});
    final result = gatewayBody['result'] as Map<String, dynamic>;

    try {
      final verifyBody = await _api.post('/api/payments/verify', result);
      return AppOrder.fromJson(verifyBody['order'] as Map<String, dynamic>);
    } on ApiException catch (e) {
      // A retried verification of an already-verified payment is still a success.
      if (e.code == 'ALREADY_VERIFIED') {
        final orderBody = await _api.get('/api/orders/$orderId');
        return AppOrder.fromJson(orderBody['order'] as Map<String, dynamic>);
      }
      rethrow;
    }
  }
}
