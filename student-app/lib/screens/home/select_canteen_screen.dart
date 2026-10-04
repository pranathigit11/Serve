import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/canteen_provider.dart';
import '../../providers/cart_provider.dart';
import '../../theme/app_theme.dart';
import '../../utils/constants.dart';
import '../../models/canteen.dart';

class SelectCanteenScreen extends StatefulWidget {
  const SelectCanteenScreen({super.key});

  @override
  State<SelectCanteenScreen> createState() => _SelectCanteenScreenState();
}

class _SelectCanteenScreenState extends State<SelectCanteenScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CanteenProvider>().fetchCanteens();
    });
  }

  void _selectCanteen(Canteen canteen) async {
    final cartProvider = context.read<CartProvider>();
    final canteenProvider = context.read<CanteenProvider>();
    
    if (cartProvider.items.isNotEmpty && cartProvider.canteenId != canteen.id) {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Change Canteen?'),
          content: Text('Your cart contains items from another canteen. Changing canteens will clear your cart.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.accent),
              child: const Text('Change Canteen'),
            ),
          ],
        ),
      );
      
      if (confirm != true) return;
      cartProvider.clear();
    }
    
    await canteenProvider.setActiveCanteen(canteen);
    if (mounted) {
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CanteenProvider>();

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Select Canteen', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
      ),
      body: provider.isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : provider.error != null
              ? Center(child: Text('Error: ${provider.error}', style: const TextStyle(color: AppTheme.error)))
              : RefreshIndicator(
                  onRefresh: provider.fetchCanteens,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: provider.canteens.length,
                    itemBuilder: (context, index) {
                      final canteen = provider.canteens[index];
                      final isSelected = provider.activeCanteen?.id == canteen.id;
                      final isAvailable = canteen.isActive && canteen.isAcceptingOrders;

                      return Card(
                        margin: const EdgeInsets.only(bottom: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(
                            color: isSelected ? AppTheme.primary : Colors.transparent,
                            width: 2,
                          ),
                        ),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(16),
                          onTap: isAvailable ? () => _selectCanteen(canteen) : null,
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        canteen.name,
                                        style: TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold,
                                          color: isAvailable ? AppTheme.textPrimary : AppTheme.textSecondary,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        canteen.location,
                                        style: const TextStyle(
                                          fontSize: 14,
                                          color: AppTheme.textSecondary,
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          Container(
                                            width: 8,
                                            height: 8,
                                            decoration: BoxDecoration(
                                              shape: BoxShape.circle,
                                              color: isAvailable ? AppTheme.primary : AppTheme.error,
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            isAvailable ? 'Accepting Orders' : 'Currently Unavailable',
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w600,
                                              color: isAvailable ? AppTheme.primary : AppTheme.error,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                if (isSelected)
                                  const Icon(Icons.check_circle, color: AppTheme.primary, size: 28),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
