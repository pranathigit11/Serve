import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/student_provider.dart';
import '../../services/auth/auth_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/constants.dart';
import '../../widgets/primary_button.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _errorMsg;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      setState(() => _errorMsg = 'Please enter email and password.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });

    try {
      debugPrint('[AUTH] Sign-in started');
      await AuthService.signInWithEmailAndPassword(email, password);
      debugPrint('[AUTH] Firebase sign-in successful');
      debugPrint('[AUTH] Firebase UID: ${AuthService.currentUser?.uid}');
      
      // Force token refresh and set it in ApiService
      final token = await AuthService.getToken(forceRefresh: true);
      if (token != null) {
        debugPrint('[AUTH] ID token obtained');
      } else {
        debugPrint('[AUTH] ID token could not be obtained');
      }

      if (!mounted) return;

      // Verify Student Role by fetching profile
      debugPrint('[AUTH] Calling /api/students/me');
      final studentProvider = context.read<StudentProvider>();
      await studentProvider.fetchStudentProfile();

      if (!mounted) return;

      if (studentProvider.error != null) {
        debugPrint('[AUTH] /api/students/me failed: ${studentProvider.error}');
        await AuthService.signOut();
        setState(() {
          if (studentProvider.error!.contains('Forbidden')) {
            _errorMsg = 'This account does not have Student access.';
          } else if (studentProvider.error!.contains('Unauthorized')) {
            _errorMsg = 'Authentication token was rejected.';
          } else if (studentProvider.error!.contains('404')) {
            _errorMsg = 'Student account is not linked correctly.';
          } else {
            _errorMsg = 'Server error. Please try again.';
          }
        });
      } else {
        debugPrint('[AUTH] /api/students/me status: ok');
        Navigator.pushReplacementNamed(context, AppConstants.routeHome);
      }
    } catch (e) {
      debugPrint('[AUTH-ERROR] stage=Firebase Login');
      debugPrint('[AUTH-ERROR] type=${e.runtimeType}');
      debugPrint('[AUTH-ERROR] message=$e');
      
      await AuthService.signOut();
      
      String msg = 'Unable to sign in. Please try again.';
      final errorString = e.toString();
      
      if (errorString.contains('FirebaseAuthException')) {
        // Extract the exact error code [auth/...]
        final match = RegExp(r'\[(auth/.*?)\]').firstMatch(errorString);
        if (match != null) {
          msg = 'Firebase authentication failed: ${match.group(1)}';
        } else if (errorString.contains('invalid-credential')) {
          msg = 'Invalid email or password.';
        } else if (errorString.contains('user-not-found')) {
          msg = 'No account found with this email.';
        } else if (errorString.contains('wrong-password')) {
          msg = 'Incorrect password.';
        } else if (errorString.contains('operation-not-allowed')) {
          msg = 'Email/password sign-in is not enabled in Firebase.';
        } else if (errorString.contains('network-request-failed')) {
          msg = 'Network error. Check your internet connection.';
        } else if (errorString.contains('configuration-not-found')) {
          msg = 'Firebase authentication failed: auth/configuration-not-found';
        } else {
          msg = 'Firebase authentication failed: $errorString';
        }
      }

      setState(() {
        _errorMsg = msg;
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Student Login'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 32),
              Image.asset(
                'assets/images/logo.png',
                height: 80,
                fit: BoxFit.contain,
              ),
              const SizedBox(height: 32),
              const Text(
                'Welcome Back',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              const Text(
                'Sign in to access your student account',
                style: TextStyle(
                  color: AppTheme.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              if (_errorMsg != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.accent.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.accent),
                  ),
                  child: Text(
                    _errorMsg!,
                    style: const TextStyle(color: AppTheme.accent),
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(height: 24),
              ],
              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  labelText: 'Email',
                  prefixIcon: const Icon(Icons.email_outlined),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(Icons.lock_outline),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(height: 32),
              PrimaryButton(
                text: 'Sign In',
                onPressed: _isLoading ? null : _login,
                isLoading: _isLoading,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
