class AppNotification {
  final String id;
  final String title;
  final String message;
  final DateTime time;
  bool isRead;

  AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.time,
    this.isRead = false,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
    id: json['id'] as String,
    title: json['title'] as String? ?? '',
    message: json['message'] as String? ?? '',
    time: DateTime.parse(json['createdAt'] as String).toLocal(),
    isRead: json['isRead'] as bool? ?? false,
  );
}
