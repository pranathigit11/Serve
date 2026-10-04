import '../models/food_item.dart';
import 'menu_repository.dart';
import '../services/api/api_service.dart';

class ApiMenuRepository implements MenuRepository {
  ApiMenuRepository();

  @override
  Future<List<FoodItem>> getMenuItems(String canteenId) async {
    final data = await ApiService.get('/menu?canteenId=$canteenId');
    
    List<FoodItem> items = [];
    if (data is List) {
      for (var cat in data) {
        if (cat['menuItems'] != null) {
          for (var item in cat['menuItems']) {
            if (item['isAvailable']) { // Only show available items for student
              String fallbackImage = 'assets/images/food/cat_sandwich.jpg';
              final String catName = cat['name'] ?? '';
              if (catName.toLowerCase().contains('roll')) {
                fallbackImage = 'assets/images/food/cat_roll.jpg';
              } else if (catName.toLowerCase().contains('omelette')) {
                fallbackImage = 'assets/images/food/cat_omelette.jpg';
              } else if (catName.toLowerCase().contains('juice')) {
                fallbackImage = 'assets/images/food/cat_juice.jpg';
              } else if (catName.toLowerCase().contains('dosa')) {
                fallbackImage = 'assets/images/food/cat_dosa.jpg';
              } else if (catName.toLowerCase().contains('beverage')) {
                fallbackImage = 'assets/images/food/cat_beverage.jpg';
              }

              items.add(FoodItem(
                id: item['id'],
                name: item['name'],
                category: catName,
                description: item['description'] ?? '',
                price: double.parse(item['price'].toString()),
                prepTime: item['prepTime'] != null ? int.tryParse(item['prepTime'].toString()) ?? 15 : 15,
                isAvailable: item['isAvailable'],
                imageUrl: item['imageUrl'] ?? fallbackImage,
              ));
            }
          }
        }
      }
    }
    return items;
  }
}
