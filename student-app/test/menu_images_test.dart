import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:student_app/services/api/mock_data.dart';

void main() {
  test('Verify all 29 menu items have correct and existing food images', () {
    final items = MockData.menuItems;
    expect(items.length, 29);

    final paths = <String>{};
    for (final item in items) {
      expect(item.imageUrl, isNotEmpty);
      expect(paths.contains(item.imageUrl), isFalse,
          reason: 'Duplicate image found: ${item.imageUrl} for ${item.name}');
      paths.add(item.imageUrl);

      final file = File(item.imageUrl);
      expect(file.existsSync(), isTrue,
          reason: 'Image file does not exist on disk: ${item.imageUrl}');
      expect(file.lengthSync(), greaterThan(1000),
          reason: 'Image file too small or empty: ${item.imageUrl}');
    }

    expect(paths.length, 29);
  });
}
