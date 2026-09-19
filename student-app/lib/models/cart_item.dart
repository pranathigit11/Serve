import 'food_item.dart';

class CartItem {
  final FoodItem foodItem;
  int quantity;

  CartItem({required this.foodItem, required this.quantity});

  double get totalPrice => foodItem.price * quantity;
}
