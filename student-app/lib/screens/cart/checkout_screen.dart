import 'dart:math';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/canteen.dart';
import '../../providers/cart_provider.dart';
import '../../providers/order_provider.dart';
import '../../providers/session_provider.dart';
import '../../services/api/api_client.dart';
import '../../theme/app_theme.dart';
import '../../utils/canteen_switch.dart';
import '../../utils/constants.dart';
import '../../widgets/canteen_option_tile.dart';
import '../../widgets/primary_button.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  bool _isProcessing = false;

  /// One key per checkout attempt: retries after a failure reuse the same
  /// pending order instead of creating duplicates.
  String _idempotencyKey = _newKey();

  static String _newKey() {
    final random = Random.secure();
    return List.generate(16, (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0')).join();
  }

  Future<void> _switchCanteen(Canteen canteen) async {
    final switched = await switchCanteen(context, canteen);
    if (!mounted || !switched) return;
    // The cart was cleared; go back to browse the new canteen's menu.
    if (context.read<CartProvider>().items.isEmpty) {
      Navigator.popUntil(context, (route) => route.isFirst);
    }
  }

  Future<void> _processPaymentAndOrder() async {
    final session = context.read<SessionProvider>();
    final cart = context.read<CartProvider>();
    final orderProvider = context.read<OrderProvider>();
    final canteen = session.selectedCanteen;
    if (canteen == null || cart.items.isEmpty) return;
    if (cart.canteenId != canteen.id) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Your cart belongs to a different canteen.')),
      );
      return;
    }

    setState(() => _isProcessing = true);

    try {
      // The server validates the items, prices the order, takes the (mock)
      // payment and verifies it; the app only sends ids and quantities.
      await orderProvider.placeOrder(cart.items, canteen.id, _idempotencyKey);

      cart.clearCart();
      _idempotencyKey = _newKey();

      if (mounted) {
        Navigator.pushNamedAndRemoveUntil(
          context,
          AppConstants.routeOrderConfirmation,
          (route) => route.isFirst,
        );
      }
    } on ApiException catch (e) {
      if (e.code == 'ORDER_NOT_PAYABLE' || e.code == 'IDEMPOTENCY_KEY_REUSED') {
        _idempotencyKey = _newKey();
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
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
    final session = context.watch<SessionProvider>();
    final selectedCanteenId = session.selectedCanteen?.id;

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
            const SizedBox(height: 32),
            const Text(
              'Night Canteen',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            const Text(
              'Select where you want to collect your order.',
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 14),
            ),
            const SizedBox(height: 16),
            ...session.canteens.map(
              (canteen) => CanteenOptionTile(
                canteen: canteen,
                isSelected: selectedCanteenId == canteen.id,
                onTap: () => _switchCanteen(canteen),
              ),
            ),
            const SizedBox(height: 32),
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
            onPressed: selectedCanteenId == null || cartProvider.items.isEmpty
                ? null
                : _processPaymentAndOrder,
          ),
        ),
      ),
    );
  }
}
