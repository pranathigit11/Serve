import 'package:flutter/foundation.dart';
import '../models/canteen.dart';
import '../services/api/api_canteen_repository.dart';
import 'package:shared_preferences/shared_preferences.dart';

class CanteenProvider with ChangeNotifier {
  final ApiCanteenRepository _repository;
  
  List<Canteen> _canteens = [];
  Canteen? _activeCanteen;
  bool _isLoading = false;
  String? _error;

  CanteenProvider(this._repository);

  List<Canteen> get canteens => _canteens;
  Canteen? get activeCanteen => _activeCanteen;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchCanteens() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _canteens = await _repository.getCanteens();
      // Restore active canteen from local storage if available
      final prefs = await SharedPreferences.getInstance();
      final savedCanteenId = prefs.getString('activeCanteenId');
      
      if (savedCanteenId != null) {
        try {
          _activeCanteen = _canteens.firstWhere((c) => c.id == savedCanteenId);
        } catch (e) {
          // Saved canteen no longer exists or is inactive
          _activeCanteen = null;
          await prefs.remove('activeCanteenId');
        }
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> setActiveCanteen(Canteen canteen) async {
    _activeCanteen = canteen;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('activeCanteenId', canteen.id);
    notifyListeners();
  }

  void updateCanteenStatus(String canteenId, bool isAcceptingOrders) {
    bool updated = false;
    for (int i = 0; i < _canteens.length; i++) {
      if (_canteens[i].id == canteenId) {
        _canteens[i] = Canteen(
          id: _canteens[i].id,
          name: _canteens[i].name,
          location: _canteens[i].location,
          isActive: _canteens[i].isActive,
          isAcceptingOrders: isAcceptingOrders,
        );
        updated = true;
        break;
      }
    }
    
    if (_activeCanteen?.id == canteenId) {
      _activeCanteen = Canteen(
        id: _activeCanteen!.id,
        name: _activeCanteen!.name,
        location: _activeCanteen!.location,
        isActive: _activeCanteen!.isActive,
        isAcceptingOrders: isAcceptingOrders,
      );
      updated = true;
    }
    
    if (updated) notifyListeners();
  }
}
