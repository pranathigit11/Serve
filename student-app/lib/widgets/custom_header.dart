import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../theme/app_theme.dart';
import '../utils/constants.dart';
import '../providers/cart_provider.dart';

class CustomHeader extends StatelessWidget {
  final String title;

  const CustomHeader({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    final cartItemCount = context.watch<CartProvider>().items.length;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Image.asset(
              'assets/images/logo.png',
              width: 40,
              height: 40,
              fit: BoxFit.contain,
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text(
                  'SERVE',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: AppTheme.textPrimary,
                    letterSpacing: 2.0,
                    height: 1.1,
                  ),
                ),
                Text(
                  'LATE NIGHT',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textSecondary,
                    letterSpacing: 1.5,
                  ),
                ),
              ],
            ),
          ],
        ),
        Row(
          children: [
            GestureDetector(
              onTap: () {
                Navigator.pushNamed(context, AppConstants.routeCart);
              },
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  const CircleAvatar(
                    backgroundColor: AppTheme.primary,
                    radius: 20,
                    child: Icon(
                      Icons.shopping_cart_outlined,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                  if (cartItemCount > 0)
                    Positioned(
                      right: -2,
                      top: -2,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: AppTheme.accent,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppTheme.surface,
                            width: 1.5,
                          ),
                        ),
                        constraints: const BoxConstraints(
                          minWidth: 18,
                          minHeight: 18,
                        ),
                        child: Center(
                          child: Text(
                            '$cartItemCount',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            GestureDetector(
              onTap: () {
                Navigator.pushNamed(context, AppConstants.routeNotifications);
              },
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  const CircleAvatar(
                    backgroundColor: AppTheme.primary,
                    radius: 20,
                    child: Icon(
                      Icons.notifications,
                      color: Colors.white,
                      size: 22,
                    ),
                  ),
                  Positioned(
                    right: 0,
                    top: 0,
                    child: Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: AppTheme.accent,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppTheme.surface, width: 1.5),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }
}
