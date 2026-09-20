import '../models/food_item.dart';
import '../services/api/mock_data.dart';
import 'menu_repository.dart';

class MockMenuRepository implements MenuRepository {
  @override
  Future<List<FoodItem>> getMenuItems() async {
    // Simulate network delay
    await Future.delayed(const Duration(milliseconds: 800));
    return MockData.menuItems;
  }
}
