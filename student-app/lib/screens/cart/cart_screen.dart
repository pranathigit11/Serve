import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/cart_provider.dart';
import '../../theme/app_theme.dart';
import '../../utils/constants.dart';
import '../../widgets/primary_button.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cartProvider = context.watch<CartProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Your Cart')),
      body: cartProvider.items.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.shopping_cart_outlined,
                    size: 80,
                    color: AppTheme.stone,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Your cart is empty.',
                    style: TextStyle(
                      fontSize: 18,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                    ),
                    child: const Text('Browse Menu'),
                  ),
                ],
              ),
            )
          : Column(
              children: [
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: cartProvider.items.length,
                    separatorBuilder: (context, index) => const Divider(),
                    itemBuilder: (context, index) {
                      final item = cartProvider.items[index];
                      return Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.foodItem.name,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${AppConstants.currencySymbol}${item.foodItem.price.toStringAsFixed(0)}',
                                  style: const TextStyle(
                                    color: AppTheme.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Row(
                            children: [
                              IconButton(
                                icon: const Icon(
                                  Icons.remove_circle_outline,
                                  color: AppTheme.primary,
                                ),
                                onPressed: () {
                                  cartProvider.updateQuantity(
                                    item.foodItem.id,
                                    item.quantity - 1,
                                  );
                                },
                              ),
                              Text(
                                '${item.quantity}',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              IconButton(
                                icon: const Icon(
                                  Icons.add_circle_outline,
                                  color: AppTheme.primary,
                                ),
                                onPressed: () {
                                  cartProvider.updateQuantity(
                                    item.foodItem.id,
                                    item.quantity + 1,
                                  );
                                },
                              ),
                            ],
                          ),
                          Text(
                            '${AppConstants.currencySymbol}${item.totalPrice.toStringAsFixed(0)}',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 10,
                        offset: const Offset(0, -5),
                      ),
                    ],
                  ),
                  child: SafeArea(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Subtotal',
                              style: TextStyle(
                                color: AppTheme.textSecondary,
                                fontSize: 16,
                              ),
                            ),
                            Text(
                              '${AppConstants.currencySymbol}${cartProvider.totalAmount.toStringAsFixed(0)}',
                              style: const TextStyle(fontSize: 16),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        const Divider(),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Total',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 20,
                              ),
                            ),
                            Text(
                              '${AppConstants.currencySymbol}${cartProvider.totalAmount.toStringAsFixed(0)}',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 20,
                                color: AppTheme.primary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        PrimaryButton(
                          text: 'Proceed to Checkout',
                          onPressed: () {
                            Navigator.pushNamed(
                              context,
                              AppConstants.routeCheckout,
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
