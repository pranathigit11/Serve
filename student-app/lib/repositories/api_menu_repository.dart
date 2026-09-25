import '../models/food_item.dart';
import 'menu_repository.dart';
import '../services/api/api_service.dart';

class ApiMenuRepository implements MenuRepository {
  final String canteenId;
  
  ApiMenuRepository({this.canteenId = 'c7e9f3b1-6b4f-4d98-8c1d-1a2b3c4d5e6f'}); // Use a hardcoded canteenId for now or pass it. We can pass it. Wait, the app currently doesn't select a canteen.

  @override
  Future<List<FoodItem>> getMenuItems() async {
    // 1. Fetch assigned canteen or just fetch all canteens and pick first active
    final canteens = await ApiService.get('/canteens');
    if (canteens.isEmpty) return [];
    
    final activeCanteenId = canteens[0]['id'];
    
    final data = await ApiService.get('/menu/canteen/$activeCanteenId');
    
    List<FoodItem> items = [];
    if (data is List) {
      for (var cat in data) {
        if (cat['menuItems'] != null) {
          for (var item in cat['menuItems']) {
            if (item['isAvailable']) { // Only show available items for student
              items.add(FoodItem(
                id: item['id'],
                name: item['name'],
                category: cat['name'],
                description: item['description'] ?? '',
                price: (item['price'] as num).toDouble(),
                prepTime: item['prepTime'] != null ? int.tryParse(item['prepTime'].toString()) ?? 15 : 15,
                isAvailable: item['isAvailable'],
                imageUrl: item['imageUrl'] ?? 'assets/images/placeholder.jpg',
              ));
            }
          }
        }
      }
    }
    return items;
  }
}
