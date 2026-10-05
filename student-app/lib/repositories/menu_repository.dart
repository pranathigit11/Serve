import '../models/food_item.dart';

class MenuCategoryInfo {
  final String id;
  final String name;
  final int sortOrder;

  MenuCategoryInfo(this.id, this.name, this.sortOrder);

  factory MenuCategoryInfo.fromJson(Map<String, dynamic> json) =>
      MenuCategoryInfo(json['id'] as String, json['name'] as String, (json['sortOrder'] as num?)?.toInt() ?? 0);
}

class CanteenMenu {
  final List<FoodItem> items;
  final List<MenuCategoryInfo> categories;
  final List<String> popularItemIds;

  CanteenMenu({required this.items, required this.categories, required this.popularItemIds});
}

abstract class MenuRepository {
  /// Fetches one canteen's menu from the backend.
  Future<CanteenMenu> getMenu(String canteenId);
}
