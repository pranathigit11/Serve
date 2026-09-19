import 'dart:async';
import '../../models/notification.dart';

class NotificationService {
  final List<AppNotification> _mockNotifications = [
    AppNotification(
      id: 'notif_1',
      title: 'Order Ready',
      message: 'Order #ORD-119 is ready for pickup.',
      time: DateTime.now().subtract(const Duration(hours: 48)),
      isRead: true,
    )
  ];

  Future<List<AppNotification>> getNotifications() async {
    await Future.delayed(const Duration(milliseconds: 400));
    return _mockNotifications;
  }
  
  // Future Firebase Cloud Messaging setup would go here
}
