import 'package:flutter/foundation.dart';

import '../models/cart_item.dart';
import '../models/food_item.dart';

class CartProvider with ChangeNotifier {
  final List<CartItem> _items = [];
  String? _canteenId;

  List<CartItem> get items => _items;
  String? get canteenId => _canteenId;

  double get totalAmount {
    return _items.fold(0, (sum, item) => sum + item.totalPrice);
  }

  void addItem(FoodItem foodItem, String canteenId, [int quantity = 1]) {
    if (_items.isEmpty) {
      _canteenId = canteenId;
    } else if (_canteenId != canteenId) {
      throw Exception('Cannot add items from different canteens to the same cart.');
    }

    final existingIndex = _items.indexWhere(
      (item) => item.foodItem.id == foodItem.id,
    );
    if (existingIndex >= 0) {
      _items[existingIndex].quantity += quantity;
    } else {
      _items.add(CartItem(foodItem: foodItem, quantity: quantity));
    }
    notifyListeners();
  }

  void updateQuantity(String foodItemId, int quantity) {
    final index = _items.indexWhere((item) => item.foodItem.id == foodItemId);
    if (index >= 0) {
      if (quantity <= 0) {
        _items.removeAt(index);
      } else {
        _items[index].quantity = quantity;
      }
      notifyListeners();
    }
  }

  void removeItem(String foodItemId) {
    _items.removeWhere((item) => item.foodItem.id == foodItemId);
    notifyListeners();
  }

  void clearCart() {
    _items.clear();
    _canteenId = null;
    notifyListeners();
  }

  void clear() {
    clearCart();
  }

  void removeStaleMockItems() {
    bool removed = false;
    _items.removeWhere((item) {
      if (!item.foodItem.id.contains('-')) {
        removed = true;
        return true;
      }
      return false;
    });
    if (removed) {
      notifyListeners();
    }
  }
}
