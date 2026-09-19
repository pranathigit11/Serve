import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'providers/cart_provider.dart';
import 'providers/menu_provider.dart';
import 'providers/order_provider.dart';

import 'theme/app_theme.dart';
import 'utils/constants.dart';

import 'screens/main_scaffold.dart';
import 'screens/menu/food_details_screen.dart';
import 'screens/cart/cart_screen.dart';
import 'screens/cart/checkout_screen.dart';
import 'screens/orders/order_confirmation_screen.dart';
import 'screens/orders/order_tracking_screen.dart';
import 'screens/notifications/notifications_screen.dart';
import 'screens/splash_screen.dart';
import 'models/food_item.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => MenuProvider()),
        ChangeNotifierProvider(create: (_) => CartProvider()),
        ChangeNotifierProvider(create: (_) => OrderProvider()),
      ],
      child: const ServeApp(),
    ),
  );
}

class ServeApp extends StatelessWidget {
  const ServeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConstants.appName,
      theme: AppTheme.theme,
      debugShowCheckedModeBanner: false,
      builder: (context, child) {
        return Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(
              maxWidth: 450,
            ), // Mobile width constraint
            child: Container(
              decoration: BoxDecoration(
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.2),
                    blurRadius: 20,
                    spreadRadius: 5,
                  ),
                ],
              ),
              child: child,
            ),
          ),
        );
      },
      initialRoute: AppConstants.routeSplash,
      onGenerateRoute: (settings) {
        switch (settings.name) {
          case AppConstants.routeSplash:
            return MaterialPageRoute(builder: (_) => const SplashScreen());
          case AppConstants.routeHome:
            return MaterialPageRoute(builder: (_) => const MainScaffold());
          case AppConstants.routeFoodDetails:
            final food = settings.arguments as FoodItem;
            return MaterialPageRoute(
              builder: (_) => FoodDetailsScreen(food: food),
            );
          case AppConstants.routeCart:
            return MaterialPageRoute(builder: (_) => const CartScreen());
          case AppConstants.routeCheckout:
            return MaterialPageRoute(builder: (_) => const CheckoutScreen());
          case AppConstants.routeOrderConfirmation:
            return MaterialPageRoute(
              builder: (_) => const OrderConfirmationScreen(),
            );
          case AppConstants.routeOrderTracking:
            return MaterialPageRoute(
              builder: (_) => const OrderTrackingScreen(),
            );
          case AppConstants.routeNotifications:
            return MaterialPageRoute(
              builder: (_) => const NotificationsScreen(),
            );
          default:
            return MaterialPageRoute(builder: (_) => const MainScaffold());
        }
      },
    );
  }
}
