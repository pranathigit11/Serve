import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Menu item image: bundled asset, https URL, or a neutral placeholder for
/// items created by staff without a picture.
class FoodImage extends StatelessWidget {
  final String imageUrl;
  final BoxFit fit;

  const FoodImage({super.key, required this.imageUrl, this.fit = BoxFit.cover});

  Widget _placeholder() => Center(
    child: Icon(Icons.restaurant, size: 32, color: AppTheme.textSecondary.withValues(alpha: 0.5)),
  );

  @override
  Widget build(BuildContext context) {
    if (imageUrl.startsWith('assets/')) {
      return Image.asset(imageUrl, fit: fit, errorBuilder: (_, _, _) => _placeholder());
    }
    if (imageUrl.startsWith('https://')) {
      return Image.network(imageUrl, fit: fit, errorBuilder: (_, _, _) => _placeholder());
    }
    return _placeholder();
  }
}
