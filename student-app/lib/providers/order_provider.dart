import 'dart:async';

import 'package:flutter/foundation.dart';

import '../models/cart_item.dart';
import '../models/order.dart';
import '../services/api/api_client.dart';
import '../services/order/order_service.dart';
import '../services/payment/payment_service.dart';
import '../services/realtime/realtime_service.dart';

/// The student's orders, kept live through Socket.IO status updates.
class OrderProvider with ChangeNotifier {
  OrderProvider() {
    _realtimeSubscription = RealtimeService.instance.stream.listen(_onRealtime);
    _reconnectSubscription = RealtimeService.instance.reconnects.listen((_) => fetchOrderHistory());
  }

  final OrderService _orderService = OrderService();
  final PaymentService _paymentService = PaymentService();
  late final StreamSubscription<RealtimeEvent> _realtimeSubscription;
  late final StreamSubscription<void> _reconnectSubscription;

  List<AppOrder> _orders = [];
  String? _trackedOrderId;
  bool _isLoading = false;

  /// The order being tracked: the one just placed (until dismissed), otherwise
  /// the most recent order that is still in progress.
  AppOrder? get activeOrder {
    if (_trackedOrderId != null) {
      for (final order in _orders) {
        if (order.id == _trackedOrderId) return order;
      }
    }
    for (final order in _orders) {
      if (order.isActive) return order;
    }
    return null;
  }

  List<AppOrder> get orderHistory => _orders;
  bool get isLoading => _isLoading;

  Future<void> fetchOrderHistory() async {
    _isLoading = true;
    notifyListeners();
    try {
      _orders = await _orderService.getOrderHistory();
    } on ApiException catch (e) {
      debugPrint('Failed to load orders: ${e.message}');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Create order → create payment → (mock) gateway → server verification.
  /// Throws [ApiException] with a user-facing message on failure.
  Future<AppOrder> placeOrder(List<CartItem> items, String canteenId, String idempotencyKey) async {
    final pending = await _orderService.createOrder(items, canteenId, idempotencyKey);
    final placed = await _paymentService.payForOrder(pending.id);
    _upsert(placed);
    _trackedOrderId = placed.id;
    notifyListeners();
    return placed;
  }

  void _upsert(AppOrder order) {
    final index = _orders.indexWhere((existing) => existing.id == order.id);
    if (index >= 0) {
      _orders = [..._orders]..[index] = order;
    } else {
      _orders = [order, ..._orders];
    }
  }

  void _onRealtime(RealtimeEvent event) {
    if (event.name != 'order:status_updated' && event.name != 'order:cancelled') return;
    final order = AppOrder.fromJson(event.data);
    if (order.status == OrderStatus.pending) return;
    _upsert(order);
    notifyListeners();
  }

  void clearActiveOrder() {
    _trackedOrderId = null;
    notifyListeners();
  }

  void clear() {
    _orders = [];
    _trackedOrderId = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _realtimeSubscription.cancel();
    _reconnectSubscription.cancel();
    super.dispose();
  }
}
