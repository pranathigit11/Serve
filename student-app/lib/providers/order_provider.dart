import 'package:flutter/foundation.dart';
import '../models/order.dart';
import '../services/order/order_service.dart';

class OrderProvider with ChangeNotifier {
  final OrderService _orderService = OrderService();

  AppOrder? _activeOrder = AppOrder(
    id: 'mock_active_124',
    orderNumber: '124',
    items: [
      OrderItem(foodItemName: 'Maggi', quantity: 2, priceAtTime: 40),
      OrderItem(foodItemName: 'Cold Coffee', quantity: 1, priceAtTime: 50),
    ],
    totalAmount: 130,
    status: OrderStatus.preparing,
    createdAt: DateTime.now().subtract(const Duration(minutes: 5)),
  );
  List<AppOrder> _orderHistory = [];
  bool _isLoading = false;

  AppOrder? get activeOrder => _activeOrder;
  List<AppOrder> get orderHistory => _orderHistory;
  bool get isLoading => _isLoading;

  Future<void> fetchOrderHistory() async {
    _isLoading = true;
    notifyListeners();
    
    _orderHistory = await _orderService.getOrderHistory();
    
    _isLoading = false;
    notifyListeners();
  }

  Future<void> placeOrder(List<OrderItem> items, double totalAmount) async {
    _isLoading = true;
    notifyListeners();

    _activeOrder = await _orderService.createOrder(items, totalAmount);

    _isLoading = false;
    notifyListeners();
    
    // Simulate order progress
    _simulateOrderProgress();
  }
  
  void _simulateOrderProgress() {
    if (_activeOrder == null) return;
    
    // In a real app, this would be updated via Socket.IO
    Future.delayed(const Duration(seconds: 4), () {
      if (_activeOrder != null && _activeOrder!.status == OrderStatus.pending) {
        _activeOrder = AppOrder(
          id: _activeOrder!.id,
          orderNumber: _activeOrder!.orderNumber,
          items: _activeOrder!.items,
          totalAmount: _activeOrder!.totalAmount,
          status: OrderStatus.confirmed,
          createdAt: _activeOrder!.createdAt,
          estimatedReadyAt: _activeOrder!.estimatedReadyAt,
        );
        notifyListeners();
      }
    });
    
    Future.delayed(const Duration(seconds: 8), () {
      if (_activeOrder != null && _activeOrder!.status == OrderStatus.confirmed) {
        _activeOrder = AppOrder(
          id: _activeOrder!.id,
          orderNumber: _activeOrder!.orderNumber,
          items: _activeOrder!.items,
          totalAmount: _activeOrder!.totalAmount,
          status: OrderStatus.preparing,
          createdAt: _activeOrder!.createdAt,
          estimatedReadyAt: _activeOrder!.estimatedReadyAt,
        );
        notifyListeners();
      }
    });

    Future.delayed(const Duration(seconds: 15), () {
      if (_activeOrder != null && _activeOrder!.status == OrderStatus.preparing) {
        _activeOrder = AppOrder(
          id: _activeOrder!.id,
          orderNumber: _activeOrder!.orderNumber,
          items: _activeOrder!.items,
          totalAmount: _activeOrder!.totalAmount,
          status: OrderStatus.ready,
          createdAt: _activeOrder!.createdAt,
          estimatedReadyAt: _activeOrder!.estimatedReadyAt,
        );
        notifyListeners();
      }
    });
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
