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
}
