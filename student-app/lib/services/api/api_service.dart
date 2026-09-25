import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../utils/config.dart';

class ApiService {
  static Future<dynamic> get(String endpoint) async {
    final response = await http.get(Uri.parse('${AppConfig.apiBaseUrl}$endpoint'));
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body)['data'];
    }
    throw Exception('Failed to load data: ${response.statusCode} ${response.body}');
  }

  static Future<dynamic> post(String endpoint, Map<String, dynamic> body) async {
    final response = await http.post(
      Uri.parse('${AppConfig.apiBaseUrl}$endpoint'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body)['data'];
    }
    throw Exception('Failed to post data: ${response.statusCode} ${response.body}');
  }

  static Future<dynamic> patch(String endpoint, Map<String, dynamic> body) async {
    final response = await http.patch(
      Uri.parse('${AppConfig.apiBaseUrl}$endpoint'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body)['data'];
    }
    throw Exception('Failed to patch data: ${response.statusCode} ${response.body}');
  }
}
