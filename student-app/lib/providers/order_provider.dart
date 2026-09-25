import 'package:flutter/foundation.dart';

import '../models/order.dart';
import '../services/order/order_service.dart';
import '../services/api/socket_service.dart';

class OrderProvider with ChangeNotifier {
  final OrderService _orderService = OrderService();

  AppOrder? _activeOrder = null;
  List<AppOrder> _orderHistory = [];
  bool _isLoading = false;

  AppOrder? get activeOrder => _activeOrder;
  List<AppOrder> get orderHistory => _orderHistory;
  bool get isLoading => _isLoading;

  OrderProvider() {
    socketService.on('order:status_updated', _onOrderStatusUpdated);
    socketService.on('order:cancelled', _onOrderStatusUpdated);
  }

  @override
  void dispose() {
    socketService.off('order:status_updated', _onOrderStatusUpdated);
    socketService.off('order:cancelled', _onOrderStatusUpdated);
    super.dispose();
  }

  void _onOrderStatusUpdated(dynamic data) {
    if (_activeOrder != null && data['orderId'] == _activeOrder!.id || data['id'] == _activeOrder?.id) {
      // Refresh the order history to get the latest mapped data easily
      // Or manually parse. Since OrderService maps it correctly, let's just fetch history
      fetchOrderHistory();
    }
  }

  Future<void> fetchOrderHistory() async {
    _isLoading = true;
    notifyListeners();

    try {
      final allOrders = await _orderService.getOrderHistory();
      
      _orderHistory = [];
      _activeOrder = null;
      
      for (var o in allOrders) {
        if (o.status == OrderStatus.completed || o.status == OrderStatus.cancelled) {
          _orderHistory.add(o);
        } else {
          // If there are multiple, we just track the most recent one for activeOrder 
          // or we can sort them. Let's just assign it.
          if (_activeOrder == null) {
            _activeOrder = o;
          } else {
            // we could push others to history or keep them hidden for now since the UI only supports one
            _orderHistory.add(o);
          }
        }
      }
    } catch(e) {
      print('Error fetching orders: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> placeOrder(
    List<OrderItem> items,
    double totalAmount,
    String canteenId,
  ) async {
    _isLoading = true;
    notifyListeners();

    try {
      _activeOrder = await _orderService.createOrder(
        items,
        totalAmount,
        canteenId,
      );
    } catch(e) {
      print('Error placing order: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  void clearActiveOrder() {
    if (_activeOrder != null) {
      // Move to history if completed/cancelled
      _orderHistory.insert(0, _activeOrder!);
    }
    _activeOrder = null;
    notifyListeners();
  }
}
