import '../models/food_item.dart';

abstract class MenuRepository {
  /// Fetches the complete list of food items from the backend for a specific canteen.
  Future<List<FoodItem>> getMenuItems(String canteenId);
}
