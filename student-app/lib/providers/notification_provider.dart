import 'dart:async';

import 'package:flutter/foundation.dart';

import '../models/notification.dart';
import '../services/api/api_client.dart';
import '../services/notification/notification_service.dart';
import '../services/realtime/realtime_service.dart';

class NotificationProvider with ChangeNotifier {
  NotificationProvider() {
    _realtimeSubscription = RealtimeService.instance.stream.listen((event) {
      if (event.name != 'notification:created') return;
      final notification = AppNotification.fromJson(event.data);
      _notifications = [notification, ..._notifications.where((n) => n.id != notification.id)];
      notifyListeners();
    });
  }

  final NotificationService _service = NotificationService();
  late final StreamSubscription<RealtimeEvent> _realtimeSubscription;

  List<AppNotification> _notifications = [];
  bool _isLoading = false;

  List<AppNotification> get notifications => _notifications;
  bool get isLoading => _isLoading;
  int get unreadCount => _notifications.where((n) => !n.isRead).length;

  Future<void> fetch() async {
    _isLoading = true;
    notifyListeners();
    try {
      _notifications = await _service.getNotifications();
    } on ApiException catch (e) {
      debugPrint('Failed to load notifications: ${e.message}');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void markRead(AppNotification notification) {
    if (notification.isRead) return;
    notification.isRead = true;
    notifyListeners();
    _service.markRead(notification.id).catchError((Object _) {});
  }

  void clear() {
    _notifications = [];
    notifyListeners();
  }

  @override
  void dispose() {
    _realtimeSubscription.cancel();
    super.dispose();
  }
}
