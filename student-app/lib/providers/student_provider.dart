import 'package:flutter/foundation.dart';
import '../services/api/api_service.dart';

class StudentProvider with ChangeNotifier {
  Map<String, dynamic>? _student;
  bool _isLoading = false;
  String? _error;

  Map<String, dynamic>? get student => _student;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchStudentProfile() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _student = await ApiService.get('/students/me');
    } catch(e) {
      _error = e.toString();
      print('Error fetching student profile: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  void clearStudent() {
    _student = null;
    notifyListeners();
  }
}
