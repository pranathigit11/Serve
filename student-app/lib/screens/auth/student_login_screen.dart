import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/session_provider.dart';
import '../../theme/app_theme.dart';
import '../../utils/constants.dart';
import '../../utils/navigation.dart';
import '../../widgets/primary_button.dart';

/// Student sign-in / sign-up, styled like the role selection screen.
class StudentLoginScreen extends StatefulWidget {
  const StudentLoginScreen({super.key});

  @override
  State<StudentLoginScreen> createState() => _StudentLoginScreenState();
}

class _StudentLoginScreenState extends State<StudentLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _rollNumber = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  String? _hostel;
  bool _isSignUp = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    context.read<SessionProvider>().loadCanteens();
  }

  @override
  void dispose() {
    _name.dispose();
    _rollNumber.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit(SessionProvider session) async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    final completingRegistration = session.status == SessionStatus.unregistered;
    bool ok;
    if (completingRegistration || _isSignUp) {
      ok = await session.register(
        name: _name.text.trim(),
        rollNumber: _rollNumber.text.trim(),
        hostel: _hostel!,
        email: _email.text,
        password: _password.text,
      );
    } else {
      // A signed-in user without a SERVE account is shown the profile fields.
      ok = await session.signIn(_email.text, _password.text);
    }
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) enterStudentApp(context);
  }

  InputDecoration _decoration(String label) => InputDecoration(
    labelText: label,
    filled: true,
    fillColor: AppTheme.surface,
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: AppTheme.stone.withValues(alpha: 0.2)),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: AppTheme.primary, width: 2),
    ),
  );

  String? _required(String? value) => (value == null || value.trim().isEmpty) ? 'Required' : null;

  @override
  Widget build(BuildContext context) {
    final session = context.watch<SessionProvider>();
    final completingRegistration = session.status == SessionStatus.unregistered;
    final showProfileFields = completingRegistration || _isSignUp;
    final hostels = session.hostels;

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 24),
                Image.asset('assets/images/logo.png', width: 80, height: 80, fit: BoxFit.contain),
                const SizedBox(height: 16),
                const Text(
                  'SERVE',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                    color: AppTheme.textPrimary,
                    letterSpacing: 4.0,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  AppConstants.tagline,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: AppTheme.textSecondary,
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 40),
                Text(
                  completingRegistration
                      ? 'Complete your profile'
                      : _isSignUp
                      ? 'Create your account'
                      : 'Sign in as Student',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                ),
                const SizedBox(height: 24),
                if (showProfileFields) ...[
                  TextFormField(controller: _name, decoration: _decoration('Full Name'), validator: _required),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _rollNumber,
                    decoration: _decoration('Roll Number'),
                    textCapitalization: TextCapitalization.characters,
                    validator: _required,
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    initialValue: _hostel,
                    decoration: _decoration('Hostel'),
                    items: hostels.map((h) => DropdownMenuItem(value: h, child: Text(h))).toList(),
                    onChanged: (value) => setState(() => _hostel = value),
                    validator: (value) => value == null ? 'Select your hostel' : null,
                  ),
                  const SizedBox(height: 16),
                ],
                if (!completingRegistration) ...[
                  TextFormField(
                    controller: _email,
                    decoration: _decoration('Email'),
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                    validator: _required,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _password,
                    decoration: _decoration('Password'),
                    obscureText: true,
                    validator: (value) =>
                        (value == null || value.length < 6) ? 'At least 6 characters' : null,
                  ),
                ],
                if (session.error != null) ...[
                  const SizedBox(height: 16),
                  Text(
                    session.error!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: AppTheme.error, fontWeight: FontWeight.w600),
                  ),
                ],
                const SizedBox(height: 24),
                PrimaryButton(
                  text: completingRegistration
                      ? 'Continue'
                      : _isSignUp
                      ? 'Create Account'
                      : 'Sign In',
                  isLoading: _busy,
                  onPressed: () => _submit(session),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: _busy
                      ? null
                      : completingRegistration
                      ? () => session.signOut()
                      : () => setState(() => _isSignUp = !_isSignUp),
                  child: Text(
                    completingRegistration
                        ? 'Use a different account'
                        : _isSignUp
                        ? 'Already have an account? Sign in'
                        : 'New here? Create an account',
                    style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
