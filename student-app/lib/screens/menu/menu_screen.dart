import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/menu_provider.dart';
import '../../theme/app_theme.dart';
import '../../utils/constants.dart';
import '../../widgets/food_card.dart';
import '../../widgets/custom_header.dart';

class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key});

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  String _selectedFilter = 'All';

  @override
  Widget build(BuildContext context) {
    final menuProvider = context.watch<MenuProvider>();
    // Categories come from this canteen's menu in the database.
    final filters = ['All', ...menuProvider.categories];
    if (!filters.contains(_selectedFilter)) _selectedFilter = 'All';

    final filteredItems = _selectedFilter == 'All'
        ? menuProvider.items
        : menuProvider.items
              .where((item) => item.category == _selectedFilter)
              .toList();

    return SafeArea(
      child: Column(
        children: [
          const Padding(
            padding: EdgeInsets.all(16.0),
            child: CustomHeader(title: 'Menu'),
          ),
          _buildFilters(filters),
          const SizedBox(height: 16),
          Expanded(
            child: menuProvider.isLoading
                ? const Center(child: CircularProgressIndicator())
                : filteredItems.isEmpty
                ? const Center(
                    child: Text(
                      'No food items available right now.',
                      style: TextStyle(color: AppTheme.textSecondary),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: filteredItems.length,
                    itemBuilder: (context, index) {
                      final food = filteredItems[index];
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
                    },
                  ),
          ),
          const SizedBox(height: 100), // Bottom padding for floating cart
        ],
      ),
    );
  }

  Widget _buildFilters(List<String> filters) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: filters.map((filter) {
          final isSelected = filter == _selectedFilter;
          return Padding(
            padding: const EdgeInsets.only(right: 12),
            child: GestureDetector(
              onTap: () => setState(() => _selectedFilter = filter),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: isSelected ? AppTheme.primary : AppTheme.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: isSelected
                      ? null
                      : Border.all(
                          color: AppTheme.primaryLight.withValues(alpha: 0.5),
                        ),
                  boxShadow: isSelected
                      ? []
                      : [
                          BoxShadow(
                            color: AppTheme.primaryLight.withValues(alpha: 0.1),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ],
                ),
                child: Text(
                  filter,
                  style: TextStyle(
                    color: isSelected ? Colors.white : AppTheme.textPrimary,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
