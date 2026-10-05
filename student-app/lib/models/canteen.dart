class Canteen {
  final String id;
  final String name;
  final String location;
  final List<String> hostelsServed;
  final bool isActive;
  final bool isAcceptingOrders;

  Canteen({
    required this.id,
    required this.name,
    required this.location,
    required this.hostelsServed,
    required this.isActive,
    required this.isAcceptingOrders,
  });

  String get serves => 'Serves ${hostelsServed.join(' & ')}';

  bool get canTakeOrders => isActive && isAcceptingOrders;

  factory Canteen.fromJson(Map<String, dynamic> json) => Canteen(
    id: json['id'] as String,
    name: json['name'] as String,
    location: json['location'] as String? ?? '',
    hostelsServed: (json['hostelsServed'] as List<dynamic>? ?? const []).cast<String>(),
    isActive: json['status'] == 'ACTIVE',
    isAcceptingOrders: json['isAcceptingOrders'] as bool? ?? false,
  );
}
