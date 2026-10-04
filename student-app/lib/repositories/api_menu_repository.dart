import '../models/food_item.dart';
import '../services/api/api_client.dart';
import 'menu_repository.dart';

class ApiMenuRepository implements MenuRepository {
  final ApiClient _api = ApiClient.instance;

  @override
  Future<CanteenMenu> getMenu(String canteenId) async {
    final body = await _api.get('/api/canteens/$canteenId/menu');
    return CanteenMenu(
      items: (body['items'] as List<dynamic>)
          .map((json) => FoodItem.fromJson(json as Map<String, dynamic>))
          .toList(),
      categories: (body['categories'] as List<dynamic>)
          .map((json) => MenuCategoryInfo.fromJson(json as Map<String, dynamic>))
          .toList(),
      popularItemIds: (body['popularItemIds'] as List<dynamic>? ?? const []).cast<String>(),
    );
  }
}
