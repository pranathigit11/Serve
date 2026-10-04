import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/cart_provider.dart';
import '../../providers/order_provider.dart';
import '../../providers/student_provider.dart';
import '../../models/order.dart';
import '../../theme/app_theme.dart';
import '../../utils/constants.dart';
import '../../widgets/primary_button.dart';
import '../../services/payment/payment_service.dart';
import '../../services/api/api_service.dart';
import '../../utils/config.dart';


// Canteens are now dynamically loaded from the student profile

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final PaymentService _paymentService = PaymentService();
  bool _isProcessing = false;
  @override
  void initState() {
    super.initState();
    _initCheckout();
  }

  Future<void> _initCheckout() async {
    // Clear stale mock items from the cart
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CartProvider>().removeStaleMockItems();
    });
  }

  Future<void> _processPaymentAndOrder() async {
    final cart = context.read<CartProvider>();
    
    if (cart.canteenId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No canteen selected.')),
      );
      return;
    }
    
    if (cart.items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Your cart is empty. Please add items before checking out.')),
      );
      return;
    }

    setState(() => _isProcessing = true);

    final orderProvider = context.read<OrderProvider>();

    try {
      // 1. Create order
      final orderItems = cart.items
          .map(
            (item) => OrderItem(
              foodItemName: item.foodItem.name,
              foodItemId: item.foodItem.id, // ID mapped
              quantity: item.quantity,
              priceAtTime: item.foodItem.price,
            ),
          )
          .toList();

      await orderProvider.placeOrder(
        orderItems,
        cart.totalAmount,
        cart.canteenId!,
      );

      final activeOrder = orderProvider.activeOrder;
      if (activeOrder == null) throw Exception('Failed to place order');

      // 2. Create Payment Session
      final me = await ApiService.get('/students/me');
      final paymentSession = await _paymentService.createPaymentSession(activeOrder.id, me['id']);
      final paymentId = paymentSession['id'];

      // 3. Process mock payment
      final success = await _paymentService.processMockUpiPayment(
        cart.totalAmount,
      );

      // 4. Verify payment
      final isVerified = await _paymentService.verifyPayment(paymentId, success);

      if (isVerified) {
        cart.clearCart();

        if (mounted) {
          Navigator.pushNamedAndRemoveUntil(
            context,
            AppConstants.routeOrderConfirmation,
            (route) => route.isFirst,
          );
        }
      } else {
        throw Exception('Payment verification failed');
      }
    } catch (e) {
      if (mounted) {
        final errorMessage = e.toString().replaceFirst('Exception: ', '');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            duration: const Duration(seconds: 4),
          ),
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
      appBar: AppBar(title: const Text('Checkout')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Order Summary',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children:
                      cartProvider.items.map<Widget>((item) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  '${item.quantity} × ${item.foodItem.name}',
                                ),
                                Text(
                                  '${AppConstants.currencySymbol}${item.totalPrice.toStringAsFixed(0)}',
                                ),
                              ],
                            ),
                          );
                        }).toList()
                        ..add(
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 8),
                            child: Divider(),
                          ),
                        )
                        ..add(
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Total',
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              Text(
                                '${AppConstants.currencySymbol}${cartProvider.totalAmount.toStringAsFixed(0)}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                ),
              ),
            ),

            const Text(
              'Payment Method',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Card(
              shape: RoundedRectangleBorder(
                side: const BorderSide(color: AppTheme.primary, width: 2),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const ListTile(
                leading: Icon(
                  Icons.account_balance_wallet,
                  color: AppTheme.primary,
                ),
                title: Text(
                  'UPI (Online Payment)',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
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
            const SizedBox(height: 16),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: PrimaryButton(
            text:
                'Pay ${AppConstants.currencySymbol}${cartProvider.totalAmount.toStringAsFixed(0)}',
            isLoading: _isProcessing,
            onPressed: cartProvider.canteenId == null
                ? null
                : _processPaymentAndOrder,
          ),
        ),
      ),
    );
  }
}
