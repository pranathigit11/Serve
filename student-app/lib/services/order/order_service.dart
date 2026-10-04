import '../../models/cart_item.dart';
import '../../models/order.dart';
import '../api/api_client.dart';

class OrderService {
  final ApiClient _api = ApiClient.instance;

  /// Creates an order awaiting payment. Only item ids and quantities are sent;
  /// the server prices everything. The idempotency key makes retries safe.
  Future<AppOrder> createOrder(List<CartItem> items, String canteenId, String idempotencyKey) async {
    final body = await _api.post(
      '/api/orders',
      {
        'canteenId': canteenId,
        'items': items.map((item) => {'menuItemId': item.foodItem.id, 'quantity': item.quantity}).toList(),
      },
      {'Idempotency-Key': idempotencyKey},
    );
    return AppOrder.fromJson(body['order'] as Map<String, dynamic>);
  }

  Future<List<AppOrder>> getOrderHistory() async {
    final body = await _api.get('/api/students/me/orders');
    return (body['orders'] as List<dynamic>)
        .map((json) => AppOrder.fromJson(json as Map<String, dynamic>))
        .toList();
  }
}
