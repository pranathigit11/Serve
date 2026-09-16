import 'package:flutter/material.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Student Login')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.school, size: 80, color: Colors.deepOrange),
              const SizedBox(height: 24),
              const Text('Welcome to Night Canteen', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
              const SizedBox(height: 48),
              ElevatedButton(
                onPressed: () {
                  // TODO: Firebase Auth logic here
                  // Navigator or GoRouter to home
                },
                child: const Text('Login with Firebase'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
