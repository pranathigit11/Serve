import '../../models/order.dart';
import '../api/mock_data.dart';

class OrderService {
  Future<AppOrder> createOrder(List<OrderItem> items, double totalAmount) async {
    await Future.delayed(const Duration(seconds: 1));
    
    return AppOrder(
      id: 'order_${DateTime.now().millisecondsSinceEpoch}',
      orderNumber: 'ORD-${100 + (DateTime.now().millisecondsSinceEpoch % 900)}',
      items: items,
      totalAmount: totalAmount,
      status: OrderStatus.pending,
      createdAt: DateTime.now(),
      estimatedReadyAt: DateTime.now().add(const Duration(minutes: 15)),
    );
  }

  Future<List<AppOrder>> getOrderHistory() async {
    await Future.delayed(const Duration(milliseconds: 600));
    return MockData.orderHistory;
  }
}
