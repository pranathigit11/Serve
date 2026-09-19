import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../providers/order_provider.dart';
import '../../theme/app_theme.dart';
import '../../utils/constants.dart';
import '../../models/order.dart';
import '../../widgets/custom_header.dart';

class OrderHistoryScreen extends StatefulWidget {
  const OrderHistoryScreen({super.key});

  @override
  State<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends State<OrderHistoryScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<OrderProvider>().fetchOrderHistory();
    });
  }

  @override
  Widget build(BuildContext context) {
    final orderProvider = context.watch<OrderProvider>();

    return SafeArea(
      child: Column(
        children: [
          const Padding(
            padding: EdgeInsets.all(16.0),
            child: CustomHeader(title: 'My Orders'),
          ),
          Expanded(
            child: orderProvider.isLoading
                ? const Center(child: CircularProgressIndicator())
                : orderProvider.orderHistory.isEmpty
                ? const Center(
                    child: Text(
                      'No previous orders yet.',
                      style: TextStyle(color: AppTheme.textSecondary),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.only(
                      left: 16,
                      right: 16,
                      bottom: 100,
                    ),
                    itemCount: orderProvider.orderHistory.length,
                    itemBuilder: (context, index) {
                      final order = orderProvider.orderHistory[index];
                      return _buildOrderHistoryCard(order);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderHistoryCard(AppOrder order) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Order ${order.orderNumber}',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                Text(
                  DateFormat('MMM d, h:mm a').format(order.createdAt),
                  style: const TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...order.items.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text('${item.quantity} × ${item.foodItemName}'),
              ),
            ),
            const SizedBox(height: 12),
            const Divider(),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${AppConstants.currencySymbol}${order.totalAmount.toStringAsFixed(0)}',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                Text(
                  order.status.displayName,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: order.status == OrderStatus.completed
                        ? AppTheme.success
                        : AppTheme.primary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
