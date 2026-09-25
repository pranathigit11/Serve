import 'package:flutter/foundation.dart';

import '../models/food_item.dart';
import '../repositories/menu_repository.dart';
import '../repositories/api_menu_repository.dart';
import '../services/api/api_service.dart';
import '../services/api/socket_service.dart';
import '../utils/config.dart';

class MenuProvider with ChangeNotifier {
  final MenuRepository _menuRepository = ApiMenuRepository();

  List<FoodItem> _items = [];
  bool _isLoading = false;
  bool _isAcceptingOrders = true;
  String? _activeCanteenId;

  List<FoodItem> get items => _items;
  bool get isLoading => _isLoading;
  bool get isAcceptingOrders => _isAcceptingOrders;

  MenuProvider() {
    socketService.on('menu:availability_updated', _onMenuUpdated);
    socketService.on('canteen:order_taking_updated', _onCanteenStatusUpdated);
  }

  @override
  void dispose() {
    socketService.off('menu:availability_updated', _onMenuUpdated);
    socketService.off('canteen:order_taking_updated', _onCanteenStatusUpdated);
    super.dispose();
  }

  void _onMenuUpdated(dynamic data) {
    if (data['canteenId'] == _activeCanteenId) {
      final itemId = data['menuItemId'];
      final isAvailable = data['isAvailable'] as bool;
      
      final index = _items.indexWhere((item) => item.id == itemId);
      if (index != -1) {
        _items[index] = _items[index].copyWith(isAvailable: isAvailable);
        notifyListeners();
      }
    }
  }

  void _onCanteenStatusUpdated(dynamic data) {
    if (data['canteenId'] == _activeCanteenId) {
      _isAcceptingOrders = data['isAcceptingOrders'] as bool;
      notifyListeners();
    }
  }

  Future<void> fetchMenu() async {
    if (_items.isNotEmpty) return; // simple cache

    _isLoading = true;
    notifyListeners();

    try {
      final canteens = await ApiService.get('/canteens');
      if (canteens.isNotEmpty) {
        _activeCanteenId = canteens[0]['id'];
        _isAcceptingOrders = canteens[0]['isAcceptingOrders'];
        
        socketService.connect(AppConfig.devStudentId, _activeCanteenId!);
      }

      _items = await _menuRepository.getMenuItems();
    } catch(e) {
      print('Error fetching menu: $e');
    }

    _isLoading = false;
    notifyListeners();
  }
}
