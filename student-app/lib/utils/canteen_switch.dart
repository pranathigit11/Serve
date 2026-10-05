import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/canteen.dart';
import '../providers/cart_provider.dart';
import '../providers/session_provider.dart';
import '../services/api/api_client.dart';
import '../theme/app_theme.dart';

/// Makes [target] the student's active canteen. A cart can only hold items
/// from one canteen, so a non-empty cart requires confirmation and is cleared
/// only after the switch succeeds. Returns true when the switch happened.
Future<bool> switchCanteen(BuildContext context, Canteen target) async {
  final session = context.read<SessionProvider>();
  final cart = context.read<CartProvider>();
  final messenger = ScaffoldMessenger.of(context);
  if (session.student?.selectedCanteenId == target.id) return true;

  if (cart.items.isNotEmpty) {
    final currentName = session.selectedCanteen?.name ?? 'your current canteen';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Switch canteen?'),
        content: Text(
          'Your cart has items from $currentName. Switching to ${target.name} will clear your cart.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel', style: TextStyle(color: AppTheme.textSecondary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Switch & Clear Cart', style: TextStyle(color: AppTheme.accent)),
          ),
        ],
      ),
    );
    if (confirmed != true) return false;
  }

  try {
    await session.selectCanteen(target.id);
    cart.clearCart();
    return true;
  } on ApiException catch (e) {
    messenger.showSnackBar(SnackBar(content: Text(e.message)));
    return false;
  }
}
