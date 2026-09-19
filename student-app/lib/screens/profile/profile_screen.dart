import 'package:flutter/material.dart';
import '../../services/api/mock_data.dart';
import '../../theme/app_theme.dart';
import '../../widgets/custom_header.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final student = MockData.currentStudent;

    return SafeArea(
      child: Column(
        children: [
          const Padding(
            padding: EdgeInsets.all(16.0),
            child: CustomHeader(title: 'Profile'),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  const CircleAvatar(
                    radius: 50,
                    backgroundColor: AppTheme.stone,
                    child: Icon(Icons.person, size: 50, color: Colors.white),
                  ),
                  const SizedBox(height: 16),
                  Text(student.name, style: Theme.of(context).textTheme.displayMedium),
                  const SizedBox(height: 4),
                  Text(student.studentId, style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(student.email, style: const TextStyle(color: AppTheme.textSecondary)),
                  
                  const SizedBox(height: 48),
                  
                  ListTile(
                    leading: const Icon(Icons.receipt_long),
                    title: const Text('Order History'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                    },
                  ),
                  const Divider(),
                  ListTile(
                    leading: const Icon(Icons.logout, color: AppTheme.error),
                    title: const Text('Logout', style: TextStyle(color: AppTheme.error)),
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Logged out (Mock)')),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
