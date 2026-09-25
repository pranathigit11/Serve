import '../../models/order.dart';
import '../api/api_service.dart';
import '../../utils/config.dart';

class OrderService {
  Future<AppOrder> createOrder(
    List<OrderItem> items,
    double totalAmount,
    String canteenId,
  ) async {
    final payload = {
      'studentId': AppConfig.devStudentId,
      'canteenId': canteenId,
      'items': items.map((i) => {
        'menuItemId': i.foodItemId,
        'quantity': i.quantity,
      }).toList(),
    };

    final data = await ApiService.post('/orders', payload);
    return _mapOrder(data);
  }

  Future<List<AppOrder>> getOrderHistory() async {
    final data = await ApiService.get('/orders/student/${AppConfig.devStudentId}');
    return (data as List).map((o) => _mapOrder(o)).toList();
  }
  
  AppOrder _mapOrder(dynamic o) {
    return AppOrder(
      id: o['id'],
      orderNumber: o['orderNumber'],
      items: (o['items'] as List).map((i) => OrderItem(
        foodItemName: i['menuItem']['name'],
        quantity: i['quantity'],
        priceAtTime: double.parse(i['priceAtTime'].toString())
      )).toList(),
      totalAmount: double.parse(o['totalAmount'].toString()),
      status: _mapStatus(o['status']),
      createdAt: DateTime.parse(o['createdAt']),
      canteenId: o['canteenId'],
    );
  }

  OrderStatus _mapStatus(String status) {
    switch(status) {
      case 'PLACED':
      case 'PAYMENT_CONFIRMED':
        return OrderStatus.confirmed;
      case 'PREPARING': return OrderStatus.preparing;
      case 'READY': return OrderStatus.ready;
      case 'COLLECTED': return OrderStatus.completed;
      default: return OrderStatus.pending;
    }
  }
}
