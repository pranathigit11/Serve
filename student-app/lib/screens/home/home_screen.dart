import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/order_provider.dart';
import '../../providers/menu_provider.dart';
import '../../models/order.dart';
import '../../theme/app_theme.dart';
import '../../utils/constants.dart';
import '../../widgets/food_card.dart';
import '../../widgets/custom_header.dart';
import '../../models/food_item.dart';

class HomeScreen extends StatefulWidget {
  final VoidCallback onNavigateToMenu;

  const HomeScreen({super.key, required this.onNavigateToMenu});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MenuProvider>().fetchMenu();
    });
  }

  /// "Your Most Ordered": the student's own order history mapped onto the
  /// current canteen's live menu. New students see what is popular in this
  /// canteen (from real orders), falling back to the first available items.
  List<FoodItem> _personalisedItems(OrderProvider orderProvider, MenuProvider menuProvider) {
    final frequency = <String, int>{};
    for (final order in orderProvider.orderHistory) {
      for (final item in order.items) {
        final id = item.menuItemId;
        if (id != null) frequency[id] = (frequency[id] ?? 0) + item.quantity;
      }
    }
    final mostOrdered = (frequency.entries.toList()..sort((a, b) => b.value.compareTo(a.value)))
        .map((entry) => menuProvider.itemById(entry.key))
        .whereType<FoodItem>()
        .take(4)
        .toList();
    if (mostOrdered.isNotEmpty) return mostOrdered;
    final popular = menuProvider.popularItemIds.map(menuProvider.itemById).whereType<FoodItem>().take(4).toList();
    if (popular.isNotEmpty) return popular;
    return menuProvider.items.where((item) => item.isAvailable).take(4).toList();
  }

  @override
  Widget build(BuildContext context) {
    final orderProvider = context.watch<OrderProvider>();
    final menuProvider = context.watch<MenuProvider>();
    final isReturning = orderProvider.orderHistory.any((order) => order.status != OrderStatus.cancelled);
    final displayItems = _personalisedItems(orderProvider, menuProvider);

    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () async {
          await context.read<MenuProvider>().fetchMenu();
        },
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const CustomHeader(title: 'Home'),
                    const SizedBox(height: 32),
                    if (orderProvider.activeOrder != null) ...[
                      _buildActiveOrder(orderProvider.activeOrder!),
                      const SizedBox(height: 32),
                    ],
                    _buildPersonalizedSectionHeader(isReturning),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              sliver: menuProvider.isLoading
                  ? const SliverToBoxAdapter(
                      child: Center(child: CircularProgressIndicator()),
                    )
                  : SliverList(
                      delegate: SliverChildBuilderDelegate((context, index) {
                        if (index == displayItems.length) {
                          return Padding(
                            padding: const EdgeInsets.only(top: 16, bottom: 24),
                            child: SizedBox(
                              width: double.infinity,
                              child: OutlinedButton(
                                onPressed: widget.onNavigateToMenu,
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppTheme.primary,
                                  side: const BorderSide(
                                    color: AppTheme.primary,
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 16,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      isReturning
                                          ? 'View Full Menu'
                                          : 'Explore Full Menu',
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    const Icon(Icons.arrow_forward, size: 18),
                                  ],
                                ),
                              ),
                            ),
                          );
                        }
                        final food = displayItems[index];
                        return FoodCard(
                          food: food,
                          onTap: () {
                            Navigator.pushNamed(
                              context,
                              AppConstants.routeFoodDetails,
                              arguments: food,
                            );
                          },
                        );
                      }, childCount: displayItems.length + 1),
                    ),
            ),
            const SliverToBoxAdapter(
              child: SizedBox(height: 100),
            ), // Bottom padding for cart
          ],
        ),
      ),
    );
  }

  Widget _buildActiveOrder(AppOrder order) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppTheme.stone.withValues(alpha: 0.15),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: AppTheme.primaryLight.withValues(
                    alpha: 0.2,
                  ), // Light olive
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Text(
                  'ACTIVE ORDER',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primary,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: AppTheme.primaryLight.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: order.status == OrderStatus.ready
                            ? AppTheme.accent
                            : AppTheme.primary,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      order.status.displayName,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'ORDER #${order.orderNumber}',
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                  letterSpacing: -0.5,
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    const Icon(
                      Icons.access_time,
                      size: 16,
                      color: AppTheme.textSecondary,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      _remainingLabel(order),
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppTheme.textSecondary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            order.items
                .map((i) => '${i.quantity} × ${i.foodItemName}')
                .join(', '),
            style: const TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 16,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 24),
          Stack(
            children: [
              Container(
                height: 8,
                decoration: BoxDecoration(
                  color: AppTheme.primaryLight.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              FractionallySizedBox(
                widthFactor: _progress(order.status),
                child: Container(
                  height: 8,
                  decoration: BoxDecoration(
                    color: AppTheme.primary,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pushNamed(context, AppConstants.routeOrderTracking);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Track Order', style: TextStyle(fontSize: 16)),
                  SizedBox(width: 8),
                  Icon(Icons.arrow_forward, size: 18),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _remainingLabel(AppOrder order) {
    if (order.status == OrderStatus.ready) return 'Ready for pickup';
    final eta = order.estimatedReadyAt;
    if (eta == null) return 'Order placed';
    final minutes = eta.difference(DateTime.now()).inMinutes;
    return '${minutes < 1 ? 1 : minutes} min remaining';
  }

  double _progress(OrderStatus status) {
    switch (status) {
      case OrderStatus.pending:
        return 0.1;
      case OrderStatus.confirmed:
        return 0.3;
      case OrderStatus.preparing:
        return 0.6;
      case OrderStatus.ready:
      case OrderStatus.completed:
        return 1.0;
      case OrderStatus.cancelled:
        return 0.0;
    }
  }

  Widget _buildPersonalizedSectionHeader(bool isReturning) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    isReturning ? "Your Most Ordered" : "Popular with Students",
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(
                      color: AppTheme.accent,
                      shape: BoxShape.circle,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
