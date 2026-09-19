import 'package:flutter/material.dart';
import '../models/order.dart';
import '../theme/app_theme.dart';

class OrderStatusStepper extends StatelessWidget {
  final OrderStatus currentStatus;

  const OrderStatusStepper({super.key, required this.currentStatus});

  @override
  Widget build(BuildContext context) {
    final statuses = [
      OrderStatus.pending,
      OrderStatus.confirmed,
      OrderStatus.preparing,
      OrderStatus.ready,
      OrderStatus.completed,
    ];

    // If cancelled, just show cancelled
    if (currentStatus == OrderStatus.cancelled) {
      return const Center(
        child: Text(
          'Order Cancelled',
          style: TextStyle(color: AppTheme.error, fontWeight: FontWeight.bold, fontSize: 18),
        ),
      );
    }

    final currentIndex = statuses.indexOf(currentStatus);

    return Column(
      children: statuses.asMap().entries.map((entry) {
        final index = entry.key;
        final status = entry.value;
        final isCompleted = index < currentIndex;
        final isCurrent = index == currentIndex;

        return Padding(
          padding: const EdgeInsets.only(bottom: 24),
          child: Row(
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isCompleted ? AppTheme.success : (isCurrent ? AppTheme.primary : AppTheme.stone),
                ),
                child: isCompleted
                    ? const Icon(Icons.check, size: 16, color: Colors.white)
                    : (isCurrent
                        ? const Icon(Icons.circle, size: 12, color: Colors.white)
                        : null),
              ),
              const SizedBox(width: 16),
              Text(
                status.displayName,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                  color: (isCompleted || isCurrent) ? AppTheme.textPrimary : AppTheme.textSecondary,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}
