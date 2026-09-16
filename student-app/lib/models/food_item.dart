class FoodItem {
  final String id;
  final String name;
  final double price;
  final bool isAvailable;
  final int prepTime;
  final String imageUrl;
  final String? description;

  FoodItem({
    required this.id,
    required this.name,
    required this.price,
    required this.isAvailable,
    required this.prepTime,
    required this.imageUrl,
    this.description,
  });

  factory FoodItem.fromJson(Map<String, dynamic> json) {
    return FoodItem(
      id: json['id'] as String,
      name: json['name'] as String,
      price: (json['price'] as num).toDouble(),
      isAvailable: json['isAvailable'] as bool,
      prepTime: json['prepTime'] as int,
      imageUrl: json['imageUrl'] as String,
      description: json['description'] as String?,
    );
  }
}
