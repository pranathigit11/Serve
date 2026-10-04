import '../../models/notification.dart';
import '../api/api_client.dart';

class NotificationService {
  final ApiClient _api = ApiClient.instance;

  Future<List<AppNotification>> getNotifications() async {
    final body = await _api.get('/api/notifications');
    return (body['notifications'] as List<dynamic>)
        .map((json) => AppNotification.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<void> markRead(String id) async {
    await _api.post('/api/notifications/$id/read');
  }

  // Push notifications (Firebase Cloud Messaging) are not configured yet.
}
