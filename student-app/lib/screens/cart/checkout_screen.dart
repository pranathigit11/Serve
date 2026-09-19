import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/cart_provider.dart';
import '../../providers/order_provider.dart';
import '../../models/order.dart';
import '../../theme/app_theme.dart';
import '../../utils/constants.dart';
import '../../widgets/primary_button.dart';
import '../../services/payment/payment_service.dart';
import '../../services/api/mock_data.dart';

class CanteenOption {
  final String id;
  final String name;
  final String serves;

  const CanteenOption(this.id, this.name, this.serves);
}

const _canteens = [
  CanteenOption(
    'canteen_krishna_godavari',
    'Krishna & Godavari Night Canteen',
    'Serves Krishna & Godavari',
  ),
  CanteenOption(
    'canteen_yamuna_narmada',
    'Yamuna & Narmada Night Canteen',
    'Serves Yamuna & Narmada',
  ),
  CanteenOption(
    'canteen_new_hostel',
    'New Hostel Night Canteen',
    'Serves New Hostel',
  ),
  CanteenOption(
    'canteen_vedavathi',
    'Vedavathi Night Canteen',
    'Serves Vedavathi',
  ),
  CanteenOption(
    'canteen_ganga',
    'Ganga A & Ganga B Night Canteen',
    'Serves Ganga A & Ganga B',
  ),
];

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final PaymentService _paymentService = PaymentService();
  bool _isProcessing = false;
  String? _selectedCanteenId;

  @override
  void initState() {
    super.initState();
    // Default to Krishna & Godavari Night Canteen since student's hostel is Krishna
    _selectedCanteenId = 'canteen_krishna_godavari';
  }

  Future<void> _processPaymentAndOrder() async {
    if (_selectedCanteenId == null) return;

    setState(() => _isProcessing = true);

    final cart = context.read<CartProvider>();
    final orderProvider = context.read<OrderProvider>();

    try {
      // Process mock payment
      final success = await _paymentService.processMockUpiPayment(
        cart.totalAmount,
      );

      if (success) {
        // Create OrderItems from CartItems
        final orderItems = cart.items
            .map(
              (item) => OrderItem(
                foodItemName: item.foodItem.name,
                quantity: item.quantity,
                priceAtTime: item.foodItem.price,
              ),
            )
            .toList();

        await orderProvider.placeOrder(
          orderItems,
          cart.totalAmount,
          _selectedCanteenId!,
        );

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
            ..._canteens.map((canteen) {
              final isSelected = _selectedCanteenId == canteen.id;
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: InkWell(
                  onTap: () {
                    setState(() {
                      _selectedCanteenId = canteen.id;
                    });
                  },
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppTheme.primary.withOpacity(0.05)
                          : AppTheme.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isSelected
                            ? AppTheme.primary
                            : AppTheme.stone.withOpacity(0.2),
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                canteen.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                canteen.serves,
                                style: const TextStyle(
                                  color: AppTheme.textSecondary,
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (isSelected)
                          const Icon(
                            Icons.check_circle,
                            color: AppTheme.primary,
                          )
                        else
                          Icon(
                            Icons.circle_outlined,
                            color: AppTheme.stone.withOpacity(0.5),
                          ),
                      ],
                    ),
                  ),
                ),
              );
            }),
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
            onPressed: _selectedCanteenId == null
                ? null
                : _processPaymentAndOrder,
          ),
        ),
      ),
    );
  }
}
