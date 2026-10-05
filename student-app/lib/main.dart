import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'config/app_config.dart';
import 'providers/cart_provider.dart';
import 'providers/menu_provider.dart';
import 'providers/notification_provider.dart';
import 'providers/order_provider.dart';
import 'providers/session_provider.dart';

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
import 'screens/role_selection/role_selection_screen.dart';
import 'screens/staff_dashboard/staff_dashboard_placeholder.dart';
import 'screens/auth/student_login_screen.dart';
import 'screens/canteen/canteen_selection_screen.dart';
import 'models/food_item.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final configError = AppConfig.validate();
  if (configError != null) {
    runApp(_ConfigErrorApp(message: configError));
    return;
  }

  await Firebase.initializeApp(options: AppConfig.firebaseOptions);
  final emulatorHost = AppConfig.authEmulatorHost;
  if (emulatorHost != null) {
    final parts = emulatorHost.split(':');
    await FirebaseAuth.instance.useAuthEmulator(parts[0], int.parse(parts[1]));
  }

  final session = SessionProvider();
  final menu = MenuProvider();
  final cart = CartProvider();
  final orders = OrderProvider();
  final notifications = NotificationProvider();
  _wireProviders(session, menu, cart, orders, notifications);

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: session),
        ChangeNotifierProvider.value(value: menu),
        ChangeNotifierProvider.value(value: cart),
        ChangeNotifierProvider.value(value: orders),
        ChangeNotifierProvider.value(value: notifications),
      ],
      child: const ServeApp(),
    ),
  );
}

/// Keeps menu/cart/orders consistent with the signed-in student and their
/// selected canteen.
void _wireProviders(
  SessionProvider session,
  MenuProvider menu,
  CartProvider cart,
  OrderProvider orders,
  NotificationProvider notifications,
) {
  menu.onMenuChanged = cart.syncWithMenu;
  String? loadedCanteenId;
  var wasReady = false;
  session.addListener(() {
    final ready = session.status == SessionStatus.ready;
    if (ready) {
      final canteenId = session.selectedCanteen?.id;
      if (!wasReady || canteenId != loadedCanteenId) {
        loadedCanteenId = canteenId;
        menu.loadForCanteen(canteenId);
      }
      if (!wasReady) {
        orders.fetchOrderHistory();
        notifications.fetch();
      }
    } else if (wasReady) {
      loadedCanteenId = null;
      menu.clear();
      cart.clearCart();
      orders.clear();
      notifications.clear();
    }
    wasReady = ready;
  });
}

class _ConfigErrorApp extends StatelessWidget {
  final String message;

  const _ConfigErrorApp({required this.message});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme,
      home: Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(message, textAlign: TextAlign.center),
          ),
        ),
      ),
    );
  }
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
          case AppConstants.routeRoleSelection:
            return MaterialPageRoute(builder: (_) => const RoleSelectionScreen());
          case AppConstants.routeStaffPlaceholder:
            return MaterialPageRoute(builder: (_) => const StaffDashboardPlaceholder());
          case AppConstants.routeStudentLogin:
            return MaterialPageRoute(builder: (_) => const StudentLoginScreen());
          case AppConstants.routeCanteenSelection:
            final firstTime = settings.arguments == true;
            return MaterialPageRoute(
              builder: (_) => CanteenSelectionScreen(isInitialSelection: firstTime),
            );
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
