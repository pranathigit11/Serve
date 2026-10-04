import 'dart:async';

import 'package:flutter/foundation.dart';

import '../models/food_item.dart';
import '../repositories/menu_repository.dart';
import '../repositories/api_menu_repository.dart';
import '../services/api/api_client.dart';
import '../services/realtime/realtime_service.dart';

/// Menu of the student's selected canteen. The database (via the API) is the
/// only source of truth: an empty menu stays empty.
class MenuProvider with ChangeNotifier {
  MenuProvider({MenuRepository? repository}) : _menuRepository = repository ?? ApiMenuRepository() {
    _realtimeSubscription = RealtimeService.instance.stream.listen(_onRealtime);
    _reconnectSubscription = RealtimeService.instance.reconnects.listen((_) => fetchMenu());
  }

  final MenuRepository _menuRepository;
  late final StreamSubscription<RealtimeEvent> _realtimeSubscription;
  late final StreamSubscription<void> _reconnectSubscription;

  /// Called whenever prices/availability change so the cart can follow.
  void Function(List<FoodItem> items, String? canteenId)? onMenuChanged;

  String? _canteenId;
  List<FoodItem> _items = [];
  List<MenuCategoryInfo> _categories = [];
  List<String> _popularItemIds = [];
  bool _isLoading = false;
  String? _error;

  String? get canteenId => _canteenId;
  List<FoodItem> get items => _items;
  List<String> get categories => _categories.map((category) => category.name).toList();
  List<String> get popularItemIds => _popularItemIds;
  bool get isLoading => _isLoading;
  String? get error => _error;

  FoodItem? itemById(String? id) {
    for (final item in _items) {
      if (item.id == id) return item;
    }
    return null;
  }

  Future<void> loadForCanteen(String? canteenId) async {
    if (_canteenId != canteenId) {
      _canteenId = canteenId;
      _items = [];
      _categories = [];
      _popularItemIds = [];
    }
    await fetchMenu();
  }

  Future<void> fetchMenu() async {
    final canteenId = _canteenId;
    if (canteenId == null) {
      _items = [];
      _notifyMenuChanged();
      notifyListeners();
      return;
    }
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final menu = await _menuRepository.getMenu(canteenId);
      if (canteenId != _canteenId) return;
      _items = menu.items;
      _categories = menu.categories;
      _popularItemIds = menu.popularItemIds;
    } on ApiException catch (e) {
      if (canteenId != _canteenId) return;
      _items = [];
      _error = e.message;
    } finally {
      if (canteenId == _canteenId) {
        _isLoading = false;
        _notifyMenuChanged();
        notifyListeners();
      }
    }
  }

  void _onRealtime(RealtimeEvent event) {
    final data = event.data;
    if (data['canteenId'] != _canteenId) return;
    switch (event.name) {
      case 'menu:item_updated':
        final item = FoodItem.fromJson(data);
        final index = _items.indexWhere((existing) => existing.id == item.id);
        _items = index >= 0 ? ([..._items]..[index] = item) : [..._items, item];
        if (!_categories.any((category) => category.id == item.categoryId)) {
          _categories = [..._categories, MenuCategoryInfo(item.categoryId, item.category, 1 << 20)];
        }
        break;
      case 'menu:item_deleted':
        _items = _items.where((existing) => existing.id != data['id']).toList();
        break;
      case 'menu:category_updated':
        final category = MenuCategoryInfo.fromJson(data);
        _categories = [..._categories.where((existing) => existing.id != category.id), category]
          ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
        break;
      default:
        return;
    }
    _notifyMenuChanged();
    notifyListeners();
  }

  void _notifyMenuChanged() => onMenuChanged?.call(_items, _canteenId);

  void clear() {
    _canteenId = null;
    _items = [];
    _categories = [];
    _popularItemIds = [];
    _error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _realtimeSubscription.cancel();
    _reconnectSubscription.cancel();
    super.dispose();
  }
}
