import 'food_item.dart';

class MenuResponse {
  final List<FoodItem> items;

  MenuResponse({required this.items});

  factory MenuResponse.fromJson(Map<String, dynamic> json) {
    var itemsList = json['items'] as List;
    List<FoodItem> items = itemsList.map((i) => FoodItem.fromJson(i)).toList();
    return MenuResponse(items: items);
  }
}
