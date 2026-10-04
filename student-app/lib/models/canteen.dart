class Canteen {
  final String id;
  final String name;
  final String location;
  final bool isActive;
  final bool isAcceptingOrders;

  Canteen({
    required this.id,
    required this.name,
    required this.location,
    required this.isActive,
    required this.isAcceptingOrders,
  });

  factory Canteen.fromJson(Map<String, dynamic> json) {
    return Canteen(
      id: json['id'],
      name: json['name'],
      location: json['location'],
      isActive: json['isActive'],
      isAcceptingOrders: json['isAcceptingOrders'],
    );
  }
}
