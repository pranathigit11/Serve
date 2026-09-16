import 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Night Canteen - Home')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('Canteen is OPEN', style: TextStyle(fontSize: 20, color: Colors.green)),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                // Navigate to Menu
              },
              child: const Text('View Menu'),
            ),
          ],
        ),
      ),
    );
  }
}
