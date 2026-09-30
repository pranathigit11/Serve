import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

class AppConfig {
  static String get apiBaseUrl {
    if (kIsWeb) {
      return 'http://127.0.0.1:5001/api';
    }
    try {
      if (Platform.isAndroid) {
        return 'http://10.0.2.2:5001/api';
      } else {
        return 'http://127.0.0.1:5001/api';
      }
    } catch (e) {
      // Fallback
      return 'http://127.0.0.1:5001/api';
    }
  }
}
