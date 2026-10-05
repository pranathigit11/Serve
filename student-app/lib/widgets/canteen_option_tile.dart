import 'package:flutter/material.dart';

import '../models/canteen.dart';
import '../theme/app_theme.dart';

/// Selectable canteen card (the design used on the checkout screen).
class CanteenOptionTile extends StatelessWidget {
  final Canteen canteen;
  final bool isSelected;
  final VoidCallback onTap;

  const CanteenOptionTile({
    super.key,
    required this.canteen,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            color: isSelected
                ? AppTheme.primary.withValues(alpha: 0.05)
                : AppTheme.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isSelected
                  ? AppTheme.primary
                  : AppTheme.stone.withValues(alpha: 0.2),
              width: isSelected ? 2 : 1,
            ),
          ),
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      canteen.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      canteen.serves,
                      style: const TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
              if (isSelected)
                const Icon(
                  Icons.check_circle,
                  color: AppTheme.primary,
                )
              else
                Icon(
                  Icons.circle_outlined,
                  color: AppTheme.stone.withValues(alpha: 0.5),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
