import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../utils/config.dart';
import '../auth/auth_service.dart';
import 'package:flutter/material.dart';

class ApiService {
  static String? _token;

  static void setToken(String token) {
    _token = token;
  }

  static void clearToken() {
    _token = null;
  }

  static Map<String, String> _getHeaders({bool isJson = true}) {
    final headers = <String, String>{};
    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }
    if (_token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  static Future<void> _handle401() async {
    try {
      final newToken = await AuthService.getToken(forceRefresh: true);
      if (newToken != null) {
        setToken(newToken);
      } else {
        await AuthService.signOut();
      }
    } catch (e) {
      await AuthService.signOut();
    }
  }

  static Future<dynamic> get(String endpoint, {bool isRetry = false}) async {
    final response = await http.get(
      Uri.parse('${AppConfig.apiBaseUrl}$endpoint'),
      headers: _getHeaders(isJson: false),
    );
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body)['data'];
    }
    if (response.statusCode == 401 && !isRetry) {
      await _handle401();
      return get(endpoint, isRetry: true);
    }
    _handleError(response);
  }

  static Future<dynamic> post(String endpoint, Map<String, dynamic> body, {bool isRetry = false}) async {
    final response = await http.post(
      Uri.parse('${AppConfig.apiBaseUrl}$endpoint'),
      headers: _getHeaders(),
      body: jsonEncode(body),
    );
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body)['data'];
    }
    if (response.statusCode == 401 && !isRetry) {
      await _handle401();
      return post(endpoint, body, isRetry: true);
    }
    _handleError(response);
  }

  static Future<dynamic> patch(String endpoint, Map<String, dynamic> body, {bool isRetry = false}) async {
    final response = await http.patch(
      Uri.parse('${AppConfig.apiBaseUrl}$endpoint'),
      headers: _getHeaders(),
      body: jsonEncode(body),
    );
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body)['data'];
    }
    if (response.statusCode == 401 && !isRetry) {
      await _handle401();
      return patch(endpoint, body, isRetry: true);
    }
    _handleError(response);
  }

  static void _handleError(http.Response response) {
    if (response.statusCode == 401) {
      throw Exception('Unauthorized');
    }
    if (response.statusCode == 403) {
      throw Exception('Forbidden: ${jsonDecode(response.body)['message'] ?? ''}');
    }
    throw Exception('Failed: ${response.statusCode} ${response.body}');
  }
}
