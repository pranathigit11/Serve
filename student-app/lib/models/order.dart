class OrderItem {
  final String foodItemName;
  final int quantity;
  final double priceAtTime;

  OrderItem({
    required this.foodItemName,
    required this.quantity,
    required this.priceAtTime,
  });
}

enum OrderStatus {
  pending,
  confirmed,
  preparing,
  ready,
  completed,
  cancelled
}

extension OrderStatusExtension on OrderStatus {
  String get displayName {
    switch (this) {
      case OrderStatus.pending:
        return 'Order Placed';
      case OrderStatus.confirmed:
        return 'Payment Confirmed';
      case OrderStatus.preparing:
        return 'Preparing';
      case OrderStatus.ready:
        return 'Ready for Pickup';
      case OrderStatus.completed:
        return 'Collected';
      case OrderStatus.cancelled:
        return 'Cancelled';
    }
  }
}

class AppOrder {
  final String id;
  final String orderNumber;
  final List<OrderItem> items;
  final double totalAmount;
  final OrderStatus status;
  final DateTime createdAt;
  final DateTime? estimatedReadyAt;

  AppOrder({
    required this.id,
    required this.orderNumber,
    required this.items,
    required this.totalAmount,
    required this.status,
    required this.createdAt,
    this.estimatedReadyAt,
  });
}
