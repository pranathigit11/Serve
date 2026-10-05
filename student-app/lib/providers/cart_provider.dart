import 'package:flutter/foundation.dart';

import '../models/cart_item.dart';
import '../models/food_item.dart';

/// Cart for exactly one canteen. Prices shown here are informational only;
/// the server recalculates every total from the database at checkout.
class CartProvider with ChangeNotifier {
  static const int maxQuantityPerItem = 20;

  final List<CartItem> _items = [];
  String? _canteenId;

  List<CartItem> get items => _items;

  /// Canteen the cart's items belong to (null when empty).
  String? get canteenId => _canteenId;

  double get totalAmount {
    return _items.fold(0, (sum, item) => sum + item.totalPrice);
  }

  /// Adds an item. Unavailable items and items from another canteen are refused.
  bool addItem(FoodItem foodItem, [int quantity = 1]) {
    if (!foodItem.isAvailable || quantity <= 0) return false;
    if (_items.isNotEmpty && _canteenId != foodItem.canteenId) return false;
    _canteenId = foodItem.canteenId;
    final existingIndex = _items.indexWhere(
      (item) => item.foodItem.id == foodItem.id,
    );
    if (existingIndex >= 0) {
      final existing = _items[existingIndex];
      existing.quantity = (existing.quantity + quantity).clamp(1, maxQuantityPerItem);
    } else {
      _items.add(CartItem(foodItem: foodItem, quantity: quantity.clamp(1, maxQuantityPerItem)));
    }
    notifyListeners();
    return true;
  }

  void updateQuantity(String foodItemId, int quantity) {
    final index = _items.indexWhere((item) => item.foodItem.id == foodItemId);
    if (index >= 0) {
      if (quantity <= 0) {
        _items.removeAt(index);
        if (_items.isEmpty) _canteenId = null;
      } else {
        _items[index].quantity = quantity.clamp(1, maxQuantityPerItem);
      }
      notifyListeners();
    }
  }

  void removeItem(String foodItemId) {
    _items.removeWhere((item) => item.foodItem.id == foodItemId);
    if (_items.isEmpty) _canteenId = null;
    notifyListeners();
  }

  void clearCart() {
    _items.clear();
    _canteenId = null;
    notifyListeners();
  }

  /// Keeps the cart consistent with the live menu: refreshes prices and drops
  /// items that were disabled or removed by staff.
  void syncWithMenu(List<FoodItem> menu, String? menuCanteenId) {
    if (_items.isEmpty || menuCanteenId == null || menuCanteenId != _canteenId) return;
    final byId = {for (final item in menu) item.id: item};
    var changed = false;
    for (final cartItem in List<CartItem>.from(_items)) {
      final current = byId[cartItem.foodItem.id];
      if (current == null || !current.isAvailable) {
        _items.remove(cartItem);
        changed = true;
      } else if (current.price != cartItem.foodItem.price || current.name != cartItem.foodItem.name) {
        _items[_items.indexOf(cartItem)] = CartItem(foodItem: current, quantity: cartItem.quantity);
        changed = true;
      }
    }
    if (_items.isEmpty) _canteenId = null;
    if (changed) notifyListeners();
  }
}
