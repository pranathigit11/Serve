import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

import '../../config/app_config.dart';

class ApiException implements Exception {
  final int status;
  final String code;
  final String message;
  final Map<String, dynamic> body;

  ApiException(this.status, this.code, this.message, [this.body = const {}]);

  @override
  String toString() => message;
}

/// Thin HTTP client for the SERVE API. Every request carries the current
/// Firebase ID token; identity is derived from it on the server.
class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  final http.Client _http = http.Client();
  static const _timeout = Duration(seconds: 20);

  Future<Map<String, String>> _headers({Map<String, String>? extra, bool json = false}) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) throw ApiException(401, 'AUTH_REQUIRED', 'Please sign in again.');
    final token = await user.getIdToken();
    return {
      'Authorization': 'Bearer $token',
      if (json) 'Content-Type': 'application/json',
      ...?extra,
    };
  }

  Uri _uri(String path) => Uri.parse('${AppConfig.apiBaseUrl}$path');

  Future<Map<String, dynamic>> get(String path) async =>
      _send(() async => _http.get(_uri(path), headers: await _headers()));

  /// Unauthenticated GET for public endpoints (e.g. the canteen list on sign-up).
  Future<Map<String, dynamic>> getPublic(String path) async => _send(() => _http.get(_uri(path)));

  Future<Map<String, dynamic>> post(String path, [Object? body, Map<String, String>? headers]) async =>
      _send(() async => _http.post(
            _uri(path),
            headers: await _headers(extra: headers, json: true),
            body: jsonEncode(body ?? const {}),
          ));

  Future<Map<String, dynamic>> patch(String path, Object body) async =>
      _send(() async => _http.patch(_uri(path), headers: await _headers(json: true), body: jsonEncode(body)));

  Future<Map<String, dynamic>> _send(Future<http.Response> Function() request) async {
    http.Response response;
    try {
      response = await request().timeout(_timeout);
    } on ApiException {
      rethrow;
    } catch (_) {
      throw ApiException(0, 'NETWORK_ERROR', 'Cannot reach SERVE right now. Check your connection.');
    }
    Map<String, dynamic> body = const {};
    if (response.body.isNotEmpty) {
      try {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) body = decoded;
      } catch (_) {}
    }
    if (response.statusCode >= 400) {
      throw ApiException(
        response.statusCode,
        body['error'] as String? ?? 'ERROR',
        body['message'] as String? ?? 'Something went wrong. Try Again.',
        body,
      );
    }
    return body;
  }
}
