import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/notification/notification_service.dart';
import '../../models/notification.dart';
import '../../theme/app_theme.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final NotificationService _notificationService = NotificationService();
  List<AppNotification> _notifications = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    final notifs = await _notificationService.getNotifications();
    setState(() {
      _notifications = notifs;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _notifications.isEmpty
          ? const Center(
              child: Text(
                'No new notifications',
                style: TextStyle(color: AppTheme.textSecondary),
              ),
            )
          : ListView.separated(
              itemCount: _notifications.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final notif = _notifications[index];
                return Container(
                  color: notif.isRead
                      ? Colors.transparent
                      : AppTheme.stone.withValues(alpha: 0.3),
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(16),
                    leading: CircleAvatar(
                      backgroundColor: AppTheme.primary.withValues(alpha: 0.1),
                      child: const Icon(
                        Icons.notifications,
                        color: AppTheme.primary,
                      ),
                    ),
                    title: Text(
                      notif.title,
                      style: TextStyle(
                        fontWeight: notif.isRead
                            ? FontWeight.normal
                            : FontWeight.bold,
                      ),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 4),
                        Text(notif.message),
                        const SizedBox(height: 8),
                        Text(
                          DateFormat('MMM d, h:mm a').format(notif.time),
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    onTap: () {
                      setState(() {
                        notif.isRead = true;
                      });
                    },
                  ),
                );
              },
            ),
    );
  }
}
