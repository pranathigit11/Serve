import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/order_provider.dart';
import '../../theme/app_theme.dart';
import '../../utils/constants.dart';
import '../../widgets/primary_button.dart';

class OrderConfirmationScreen extends StatelessWidget {
  const OrderConfirmationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final order = context.watch<OrderProvider>().activeOrder;

    if (order == null) {
      return const Scaffold(body: Center(child: Text('No active order')));
    }

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.check_circle, color: AppTheme.success, size: 100),
              const SizedBox(height: 24),
              Text(
                'Order Placed Successfully',
                style: Theme.of(context).textTheme.displayMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              Card(
                color: AppTheme.surface,
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      Text(
                        order.orderNumber,
                        style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: AppTheme.primary),
                      ),
                      const SizedBox(height: 16),
                      const Divider(),
                      const SizedBox(height: 16),
                      _buildRow('Amount', '${AppConstants.currencySymbol}${order.totalAmount.toStringAsFixed(0)}'),
                      const SizedBox(height: 8),
                      _buildRow('Status', 'Order Placed'),
                      const SizedBox(height: 8),
                      _buildRow('Estimated preparation', '15-20 min'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 48),
              PrimaryButton(
                text: 'Track Order',
                onPressed: () {
                  Navigator.pushReplacementNamed(context, AppConstants.routeOrderTracking);
                },
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () {
                  Navigator.popUntil(context, (route) => route.isFirst);
                },
                child: const Text('Back to Home', style: TextStyle(color: AppTheme.textSecondary)),
              )
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 16)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
      ],
    );
  }
}
