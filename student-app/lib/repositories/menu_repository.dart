import '../models/food_item.dart';

abstract class MenuRepository {
  /// Fetches the complete list of food items from the backend.
  Future<List<FoodItem>> getMenuItems();
}
