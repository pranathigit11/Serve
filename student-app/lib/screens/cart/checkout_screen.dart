import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/cart_provider.dart';
import '../../providers/order_provider.dart';
import '../../models/order.dart';
import '../../theme/app_theme.dart';
import '../../utils/constants.dart';
import '../../widgets/primary_button.dart';
import '../../services/payment/payment_service.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final PaymentService _paymentService = PaymentService();
  bool _isProcessing = false;

  Future<void> _processPaymentAndOrder() async {
    setState(() => _isProcessing = true);

    final cart = context.read<CartProvider>();
    final orderProvider = context.read<OrderProvider>();

    try {
      // Process mock payment
      final success = await _paymentService.processMockUpiPayment(cart.totalAmount);

      if (success) {
        // Create OrderItems from CartItems
        final orderItems = cart.items.map((item) => OrderItem(
          foodItemName: item.foodItem.name,
          quantity: item.quantity,
          priceAtTime: item.foodItem.price,
        )).toList();

        await orderProvider.placeOrder(orderItems, cart.totalAmount);
        
        cart.clearCart();

        if (mounted) {
          Navigator.pushNamedAndRemoveUntil(
            context,
            AppConstants.routeOrderConfirmation,
            (route) => route.isFirst,
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Something went wrong. Try Again.')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cartProvider = context.watch<CartProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Checkout'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Order Summary', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: cartProvider.items.map<Widget>((item) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('${item.quantity} × ${item.foodItem.name}'),
                          Text('${AppConstants.currencySymbol}${item.totalPrice.toStringAsFixed(0)}'),
                        ],
                      ),
                    );
                  }).toList()..add(
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Divider(),
                    )
                  )..add(
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total', style: TextStyle(fontWeight: FontWeight.bold)),
                        Text('${AppConstants.currencySymbol}${cartProvider.totalAmount.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                      ],
                    )
                  ),
                ),
              ),
            ),
            const SizedBox(height: 32),
            const Text('Payment Method', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Card(
              shape: RoundedRectangleBorder(
                side: const BorderSide(color: AppTheme.primary, width: 2),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const ListTile(
                leading: Icon(Icons.account_balance_wallet, color: AppTheme.primary),
                title: Text('UPI (Online Payment)', style: TextStyle(fontWeight: FontWeight.bold)),
                trailing: Icon(Icons.check_circle, color: AppTheme.primary),
              ),
            ),
            const Padding(
              padding: EdgeInsets.all(16.0),
              child: Text(
                'NO Cash on Delivery available.',
                style: TextStyle(color: AppTheme.textSecondary, fontSize: 12),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: PrimaryButton(
            text: 'Pay ${AppConstants.currencySymbol}${cartProvider.totalAmount.toStringAsFixed(0)}',
            isLoading: _isProcessing,
            onPressed: _processPaymentAndOrder,
          ),
        ),
      ),
    );
  }
}
