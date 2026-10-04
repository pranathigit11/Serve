import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// The development seed (backend/prisma/seed-data/menu.json) references menu
/// images bundled in this app. Every referenced asset must exist and be
/// declared in pubspec.yaml, otherwise seeded items render without pictures.
void main() {
  test('every seeded menu image is a bundled, declared asset', () {
    final seed = jsonDecode(File('../backend/prisma/seed-data/menu.json').readAsStringSync()) as Map<String, dynamic>;
    final items = (seed['items'] as List<dynamic>).cast<Map<String, dynamic>>();
    expect(items, isNotEmpty);
    final pubspec = File('pubspec.yaml').readAsStringSync();

    final paths = <String>{};
    for (final item in items) {
      final path = item['imageUrl'] as String;
      expect(paths.add(path), isTrue, reason: 'Duplicate image $path for ${item['name']}');
      final file = File(path);
      expect(file.existsSync(), isTrue, reason: 'Missing asset $path');
      expect(file.lengthSync(), greaterThan(1000), reason: 'Asset too small: $path');
      final directory = path.substring(0, path.lastIndexOf('/') + 1);
      expect(pubspec.contains('- $directory'), isTrue, reason: '$directory is not declared in pubspec.yaml');
    }
  });
}
