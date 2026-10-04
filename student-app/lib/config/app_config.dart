import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

/// Build-time configuration, supplied with `--dart-define` (or
/// `--dart-define-from-file=config/<env>.json`). Debug builds fall back to
/// local development values; release builds must provide real values and
/// never fall back to localhost / 10.0.2.2.
class AppConfig {
  static const String _apiBaseUrl = String.fromEnvironment('API_BASE_URL');
  static const String _firebaseApiKey = String.fromEnvironment('FIREBASE_API_KEY');
  static const String _firebaseAppId = String.fromEnvironment('FIREBASE_APP_ID');
  static const String _firebaseSenderId = String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID');
  static const String _firebaseProjectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
  static const String _firebaseAuthDomain = String.fromEnvironment('FIREBASE_AUTH_DOMAIN');
  static const String _authEmulatorHost = String.fromEnvironment('FIREBASE_AUTH_EMULATOR_HOST');
  static const String _staffDashboardUrl = String.fromEnvironment('STAFF_DASHBOARD_URL');
  static const String _adminPortalUrl = String.fromEnvironment('ADMIN_PORTAL_URL');

  /// Host machine as seen from the app in development (Android emulators reach
  /// it via 10.0.2.2). IPv4 literal: the Firebase emulator binds 127.0.0.1.
  static String get _localhost =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.android ? '10.0.2.2' : '127.0.0.1';

  static String get apiBaseUrl {
    if (_apiBaseUrl.isNotEmpty) return _apiBaseUrl.replaceAll(RegExp(r'/$'), '');
    return kReleaseMode ? '' : 'http://$_localhost:5001';
  }

  static String get staffDashboardUrl =>
      _staffDashboardUrl.isNotEmpty ? _staffDashboardUrl : (kReleaseMode ? '' : 'http://localhost:5173');

  static String get adminPortalUrl =>
      _adminPortalUrl.isNotEmpty ? _adminPortalUrl : (kReleaseMode ? '' : 'http://localhost:5174');

  /// Development only: the Firebase Auth emulator, e.g. "127.0.0.1:9099".
  static String? get authEmulatorHost {
    if (kReleaseMode) return null;
    if (_authEmulatorHost.isNotEmpty) return _authEmulatorHost;
    // Debug builds without explicit Firebase config talk to the local emulator.
    return _firebaseApiKey.isEmpty ? '$_localhost:9099' : null;
  }

  static FirebaseOptions get firebaseOptions {
    final useDevDefaults = !kReleaseMode && _firebaseApiKey.isEmpty;
    return FirebaseOptions(
      apiKey: useDevDefaults ? 'fake-api-key' : _firebaseApiKey,
      appId: useDevDefaults ? '1:000000000000:web:0000000000000000' : _firebaseAppId,
      messagingSenderId: useDevDefaults ? '000000000000' : _firebaseSenderId,
      projectId: useDevDefaults ? 'demo-serve' : _firebaseProjectId,
      authDomain: _firebaseAuthDomain.isEmpty ? null : _firebaseAuthDomain,
    );
  }

  /// Returns a human-readable problem with the build configuration, or null.
  static String? validate() {
    if (!kReleaseMode) return null;
    final missing = <String>[
      if (_apiBaseUrl.isEmpty) 'API_BASE_URL',
      if (_firebaseApiKey.isEmpty) 'FIREBASE_API_KEY',
      if (_firebaseAppId.isEmpty) 'FIREBASE_APP_ID',
      if (_firebaseSenderId.isEmpty) 'FIREBASE_MESSAGING_SENDER_ID',
      if (_firebaseProjectId.isEmpty) 'FIREBASE_PROJECT_ID',
    ];
    if (missing.isNotEmpty) return 'Missing build configuration: ${missing.join(', ')}';
    if (RegExp(r'localhost|127\.0\.0\.1|10\.0\.2\.2').hasMatch(_apiBaseUrl)) {
      return 'API_BASE_URL points at a development host in a release build';
    }
    if (!_apiBaseUrl.startsWith('https://')) return 'API_BASE_URL must use https in release builds';
    return null;
  }
}
