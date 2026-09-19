import 'package:flutter/foundation.dart';

import '../models/food_item.dart';
import '../repositories/menu_repository.dart';
import '../repositories/mock_menu_repository.dart';

class MenuProvider with ChangeNotifier {
  final MenuRepository _menuRepository = MockMenuRepository();

  List<FoodItem> _items = [];
  bool _isLoading = false;

  List<FoodItem> get items => _items;
  bool get isLoading => _isLoading;

  Future<void> fetchMenu() async {
    if (_items.isNotEmpty) return; // simple cache

    _isLoading = true;
    notifyListeners();

    _items = await _menuRepository.getMenuItems();

    _isLoading = false;
    notifyListeners();
  }
}
