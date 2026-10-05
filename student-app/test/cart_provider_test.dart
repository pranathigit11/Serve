import 'package:flutter_test/flutter_test.dart';
import 'package:student_app/models/food_item.dart';
import 'package:student_app/providers/cart_provider.dart';

FoodItem item(String id, {String canteenId = 'canteen-a', double price = 50, bool available = true}) => FoodItem(
  id: id,
  canteenId: canteenId,
  categoryId: 'cat',
  name: 'Item $id',
  category: 'Snacks',
  description: '',
  price: price,
  prepTime: 5,
  isAvailable: available,
  imageUrl: '',
);

void main() {
  test('cart holds items from a single canteen and remembers it', () {
    final cart = CartProvider();
    expect(cart.addItem(item('1')), isTrue);
    expect(cart.canteenId, 'canteen-a');
    expect(cart.addItem(item('2', canteenId: 'canteen-b')), isFalse);
    expect(cart.items.map((i) => i.foodItem.id), ['1']);
    cart.clearCart();
    expect(cart.canteenId, isNull);
    expect(cart.addItem(item('2', canteenId: 'canteen-b')), isTrue);
    expect(cart.canteenId, 'canteen-b');
  });

  test('unavailable items cannot be added and quantities are bounded', () {
    final cart = CartProvider();
    expect(cart.addItem(item('1', available: false)), isFalse);
    expect(cart.items, isEmpty);
    cart.addItem(item('2'), 30);
    expect(cart.items.single.quantity, CartProvider.maxQuantityPerItem);
    cart.updateQuantity('2', 0);
    expect(cart.items, isEmpty);
    expect(cart.canteenId, isNull);
  });

  test('menu sync refreshes prices and drops disabled or deleted items', () {
    final cart = CartProvider();
    cart.addItem(item('1', price: 50), 2);
    cart.addItem(item('2'));
    cart.addItem(item('3'));
    cart.syncWithMenu([item('1', price: 99), item('2', available: false)], 'canteen-a');
    expect(cart.items.map((i) => i.foodItem.id), ['1']);
    expect(cart.totalAmount, 198);
    // A menu of another canteen never touches this cart.
    cart.syncWithMenu([], 'canteen-b');
    expect(cart.items, hasLength(1));
  });
}
