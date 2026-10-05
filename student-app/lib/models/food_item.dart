class FoodItem {
  final String id;
  final String canteenId;
  final String categoryId;
  final String name;
  final String category;
  final String description;
  final double price;
  final int prepTime; // in minutes
  final bool isAvailable;
  final String imageUrl; // bundled asset path, https URL, or empty

  FoodItem({
    required this.id,
    required this.canteenId,
    required this.categoryId,
    required this.name,
    required this.category,
    required this.description,
    required this.price,
    required this.prepTime,
    required this.isAvailable,
    required this.imageUrl,
  });

  factory FoodItem.fromJson(Map<String, dynamic> json) => FoodItem(
    id: json['id'] as String,
    canteenId: json['canteenId'] as String,
    categoryId: json['categoryId'] as String,
    name: json['name'] as String,
    category: json['category'] as String? ?? '',
    description: json['description'] as String? ?? '',
    price: (json['price'] as num).toDouble(),
    prepTime: (json['prepTimeMinutes'] as num?)?.toInt() ?? 0,
    isAvailable: json['isAvailable'] as bool? ?? false,
    imageUrl: json['imageUrl'] as String? ?? '',
  );

  @override
  bool operator ==(Object other) => other is FoodItem && other.id == id;

  @override
  int get hashCode => id.hashCode;
}
