class OrderItem {
  final String? menuItemId;
  final String foodItemName;
  final int quantity;
  final double priceAtTime;

  OrderItem({
    this.menuItemId,
    required this.foodItemName,
    required this.quantity,
    required this.priceAtTime,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
    menuItemId: json['menuItemId'] as String?,
    foodItemName: json['name'] as String,
    quantity: (json['quantity'] as num).toInt(),
    priceAtTime: (json['unitPrice'] as num).toDouble(),
  );
}

enum OrderStatus { pending, confirmed, preparing, ready, completed, cancelled }

/// Maps backend order states onto the app's status steps.
OrderStatus orderStatusFromApi(String status) {
  switch (status) {
    case 'PENDING_PAYMENT':
      return OrderStatus.pending;
    case 'PLACED':
      return OrderStatus.confirmed;
    case 'PREPARING':
      return OrderStatus.preparing;
    case 'READY':
      return OrderStatus.ready;
    case 'COLLECTED':
      return OrderStatus.completed;
    default:
      return OrderStatus.cancelled;
  }
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
  final String? canteenId;
  final String? canteenName;

  AppOrder({
    required this.id,
    required this.orderNumber,
    required this.items,
    required this.totalAmount,
    required this.status,
    required this.createdAt,
    this.estimatedReadyAt,
    this.canteenId,
    this.canteenName,
  });

  bool get isActive =>
      status == OrderStatus.confirmed || status == OrderStatus.preparing || status == OrderStatus.ready;

  factory AppOrder.fromJson(Map<String, dynamic> json) => AppOrder(
    id: json['id'] as String,
    orderNumber: json['orderNumber'] as String,
    items: (json['items'] as List<dynamic>)
        .map((item) => OrderItem.fromJson(item as Map<String, dynamic>))
        .toList(),
    totalAmount: (json['totalAmount'] as num).toDouble(),
    status: orderStatusFromApi(json['status'] as String),
    createdAt: DateTime.parse(json['createdAt'] as String).toLocal(),
    estimatedReadyAt: json['estimatedReadyAt'] == null
        ? null
        : DateTime.parse(json['estimatedReadyAt'] as String).toLocal(),
    canteenId: json['canteenId'] as String?,
    canteenName: json['canteenName'] as String?,
  );
}
