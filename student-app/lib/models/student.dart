class Student {
  final String id;
  final String name;
  final String studentId;
  final String email;
  final String hostel;
  final String? selectedCanteenId;

  Student({
    required this.id,
    required this.name,
    required this.studentId,
    required this.email,
    required this.hostel,
    this.selectedCanteenId,
  });

  /// Builds a student from the `/api/me` account payload.
  factory Student.fromAccount(Map<String, dynamic> account) {
    final profile = account['student'] as Map<String, dynamic>? ?? const {};
    return Student(
      id: account['id'] as String,
      name: account['name'] as String? ?? '',
      studentId: profile['rollNumber'] as String? ?? '',
      email: account['email'] as String? ?? '',
      hostel: profile['hostel'] as String? ?? '',
      selectedCanteenId: profile['selectedCanteenId'] as String?,
    );
  }
}
