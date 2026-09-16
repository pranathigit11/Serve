import 'dart:convert';
import '../models/api_response.dart';

class ApiService {
  // Mocking GET /api/menu from DEV_PLAN.md Section 7
  Future<MenuResponse> fetchMenu() async {
    // Simulate network delay
    await Future.delayed(const Duration(seconds: 1));

    // Hardcoded mock response matching the contract precisely
    const String mockResponse = '''
    {
      "items": [
        {
          "id": "item-1234",
          "name": "Veg Puff",
          "price": 30,
          "isAvailable": true,
          "prepTime": 5,
          "imageUrl": "https://via.placeholder.com/150"
        },
        {
          "id": "item-5678",
          "name": "Paneer Roll",
          "price": 60,
          "isAvailable": false,
          "prepTime": 10,
          "imageUrl": "https://via.placeholder.com/150"
        }
      ]
    }
    ''';

    final jsonMap = json.decode(mockResponse);
    return MenuResponse.fromJson(jsonMap);
  }
}
