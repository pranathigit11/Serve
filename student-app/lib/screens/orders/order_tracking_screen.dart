import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/order_provider.dart';
import '../../models/order.dart';
import '../../theme/app_theme.dart';
import '../../utils/constants.dart';
import '../../widgets/order_status_stepper.dart';

class OrderTrackingScreen extends StatelessWidget {
  const OrderTrackingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final orderProvider = context.watch<OrderProvider>();
    final order = orderProvider.activeOrder;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Track Order'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: order == null
          ? const Center(child: Text('No active order to track.'))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    order.orderNumber,
                    style: Theme.of(context).textTheme.displayLarge?.copyWith(color: AppTheme.primary),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${order.items.length} items • ${AppConstants.currencySymbol}${order.totalAmount.toStringAsFixed(0)}',
                    style: const TextStyle(color: AppTheme.textSecondary, fontSize: 16),
                  ),
                  const SizedBox(height: 48),
                  
                  OrderStatusStepper(currentStatus: order.status),

                  const SizedBox(height: 48),

                  if (order.status == OrderStatus.ready)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: AppTheme.primary,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: [
                          const Icon(Icons.restaurant, color: Colors.white, size: 48),
                          const SizedBox(height: 16),
                          const Text(
                            'Your order is ready for pickup.',
                            style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Please come to the night canteen and show your Order Number to collect your food.',
                            style: TextStyle(color: Colors.white70, fontSize: 14),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              order.orderNumber,
                              style: const TextStyle(color: AppTheme.primary, fontSize: 24, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    ),
                  
                  if (order.status == OrderStatus.completed)
                    Center(
                      child: ElevatedButton(
                        onPressed: () {
                          context.read<OrderProvider>().clearActiveOrder();
                          Navigator.pop(context);
                        },
                        child: const Text('Back to Home'),
                      ),
                    )
                ],
              ),
            ),
    );
  }
}
