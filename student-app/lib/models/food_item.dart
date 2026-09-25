class FoodItem {
  final String id;
  final String name;
  final String category;
  final String description;
  final double price;
  final int prepTime; // in minutes
  final bool isAvailable;
  final String imageUrl;

  FoodItem({
    required this.id,
    required this.name,
    required this.category,
    required this.description,
    required this.price,
    required this.prepTime,
    required this.isAvailable,
    required this.imageUrl,
  });

  FoodItem copyWith({
    String? id,
    String? name,
    String? category,
    String? description,
    double? price,
    int? prepTime,
    bool? isAvailable,
    String? imageUrl,
  }) {
    return FoodItem(
      id: id ?? this.id,
      name: name ?? this.name,
      category: category ?? this.category,
      description: description ?? this.description,
      price: price ?? this.price,
      prepTime: prepTime ?? this.prepTime,
      isAvailable: isAvailable ?? this.isAvailable,
      imageUrl: imageUrl ?? this.imageUrl,
    );
  }
}
