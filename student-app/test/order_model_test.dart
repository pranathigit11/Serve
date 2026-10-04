import 'package:flutter_test/flutter_test.dart';
import 'package:student_app/models/order.dart';

void main() {
  test('maps every backend order state onto the tracking steps', () {
    expect(orderStatusFromApi('PENDING_PAYMENT'), OrderStatus.pending);
    expect(orderStatusFromApi('PLACED'), OrderStatus.confirmed);
    expect(orderStatusFromApi('PREPARING'), OrderStatus.preparing);
    expect(orderStatusFromApi('READY'), OrderStatus.ready);
    expect(orderStatusFromApi('COLLECTED'), OrderStatus.completed);
    expect(orderStatusFromApi('CANCELLED'), OrderStatus.cancelled);
  });

  test('parses the API order payload', () {
    final order = AppOrder.fromJson({
      'id': 'o1',
      'orderNumber': '1001',
      'canteenId': 'c1',
      'canteenName': 'Krishna',
      'status': 'READY',
      'totalAmount': 241.5,
      'items': [
        {'menuItemId': 'm1', 'name': 'Veg Sandwich', 'quantity': 3, 'unitPrice': 50, 'lineTotal': 150},
      ],
      'createdAt': '2026-10-04T18:00:00.000Z',
      'estimatedReadyAt': '2026-10-04T18:12:00.000Z',
    });
    expect(order.orderNumber, '1001');
    expect(order.status, OrderStatus.ready);
    expect(order.isActive, isTrue);
    expect(order.totalAmount, 241.5);
    expect(order.items.single.menuItemId, 'm1');
    expect(order.estimatedReadyAt, isNotNull);
  });
}
