import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../models/food_item.dart';

class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key});

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  final ApiService _apiService = ApiService();
  List<FoodItem> _items = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadMenu();
  }

  Future<void> _loadMenu() async {
    try {
      final response = await _apiService.fetchMenu();
      setState(() {
        _items = response.items;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      // Handle error visually
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Menu')),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : ListView.builder(
            itemCount: _items.length,
            itemBuilder: (context, index) {
              final item = _items[index];
              return ListTile(
                title: Text(item.name),
                subtitle: Text('₹${item.price} - ${item.prepTime} mins'),
                trailing: item.isAvailable 
                  ? ElevatedButton(onPressed: () {}, child: const Text('Add'))
                  : const Text('Sold Out', style: TextStyle(color: Colors.red)),
              );
            },
          ),
    );
  }
}
