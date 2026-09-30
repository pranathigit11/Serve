import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../utils/constants.dart';
import '../screens/role_selection/role_selection_screen.dart';
import '../services/auth/auth_service.dart';
import '../providers/student_provider.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  late Animation<double> _greenScale;
  late Animation<double> _greenOpacity;

  late Animation<double> _detailsScale;
  late Animation<double> _detailsOpacity;

  late Animation<double> _settleScale;

  late Animation<double> _titleOpacity;
  late Animation<Offset> _titleSlide;

  late Animation<double> _taglineOpacity;
  late Animation<Offset> _taglineSlide;

  @override
  void initState() {
    super.initState();

    // Total timeline: 1.8 seconds (1800ms)
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    );

    // 0.1s - 0.5s (Green shape appears) => Interval 0.055 to 0.277
    _greenScale = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.055, 0.277, curve: Curves.easeOutCubic),
      ),
    );
    _greenOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.055, 0.277, curve: Curves.easeIn),
      ),
    );

    // 0.4s - 0.8s (Details reveal) => Interval 0.222 to 0.444
    _detailsScale = Tween<double>(begin: 0.95, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.222, 0.444, curve: Curves.easeOutCubic),
      ),
    );
    _detailsOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.222, 0.444, curve: Curves.easeIn),
      ),
    );

    // 0.8s - 1.0s (Settle) => Interval 0.444 to 0.555
    _settleScale =
        TweenSequence<double>([
          TweenSequenceItem(
            tween: Tween<double>(
              begin: 1.0,
              end: 1.03,
            ).chain(CurveTween(curve: Curves.easeOut)),
            weight: 50,
          ),
          TweenSequenceItem(
            tween: Tween<double>(
              begin: 1.03,
              end: 1.0,
            ).chain(CurveTween(curve: Curves.easeIn)),
            weight: 50,
          ),
        ]).animate(
          CurvedAnimation(
            parent: _controller,
            curve: const Interval(0.444, 0.555),
          ),
        );

    // 1.0s - 1.3s (SERVE appears) => Interval 0.555 to 0.722
    _titleOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.555, 0.722, curve: Curves.easeOut),
      ),
    );
    _titleSlide = Tween<Offset>(begin: const Offset(0, 0.2), end: Offset.zero)
        .animate(
          CurvedAnimation(
            parent: _controller,
            curve: const Interval(0.555, 0.722, curve: Curves.easeOutCubic),
          ),
        );

    // 1.2s - 1.5s (Tagline appears) => Interval 0.666 to 0.833
    _taglineOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.666, 0.833, curve: Curves.easeOut),
      ),
    );
    _taglineSlide = Tween<Offset>(begin: const Offset(0, 0.5), end: Offset.zero)
        .animate(
          CurvedAnimation(
            parent: _controller,
            curve: const Interval(0.666, 0.833, curve: Curves.easeOutCubic),
          ),
        );

    _controller.forward().then((_) async {
      debugPrint('[SPLASH] Starting initialization');
      Widget? nextScreen = const RoleSelectionScreen();

      try {
        if (Firebase.apps.isEmpty) {
          debugPrint('[SPLASH] Firebase not initialized');
        } else {
          debugPrint('[SPLASH] Firebase initialized');
          final user = AuthService.currentUser;
          if (user == null) {
            debugPrint('[SPLASH] No authenticated user');
          } else {
            debugPrint('[SPLASH] Authenticated user found');
            await AuthService.getToken(forceRefresh: true)
                .timeout(const Duration(seconds: 5));
            
            if (mounted) {
              debugPrint('[SPLASH] Loading student profile');
              final studentProvider = context.read<StudentProvider>();
              await studentProvider.fetchStudentProfile()
                  .timeout(const Duration(seconds: 5));

              if (studentProvider.error == null && studentProvider.student != null) {
                debugPrint('[SPLASH] Student profile loaded');
                nextScreen = null; // null means we'll navigate to Home
              } else {
                debugPrint('[SPLASH] Student profile request failed or unmapped');
                await AuthService.signOut();
              }
            }
          }
        }
      } catch (e) {
        debugPrint('[SPLASH] Initialization failed: $e');
        try {
          await AuthService.signOut();
        } catch (_) {}
      }

      if (mounted) {
        if (nextScreen == null) {
          debugPrint('[SPLASH] Navigating to Home');
          Navigator.pushReplacementNamed(context, AppConstants.routeHome);
        } else {
          debugPrint('[SPLASH] Navigating to Role Selection');
          Navigator.of(context).pushReplacement(
            PageRouteBuilder(
              pageBuilder: (context, animation, secondaryAnimation) =>
                  nextScreen!,
              transitionsBuilder:
                  (context, animation, secondaryAnimation, child) {
                    return FadeTransition(opacity: animation, child: child);
                  },
              transitionDuration: const Duration(milliseconds: 300),
            ),
          );
        }
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Center(
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              // Only apply the settle scale if we have passed the details stage.
              // Before that, the default settle value is 1.0, which is correct.
              return Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Transform.scale(
                    scale: _settleScale.value,
                    child: SizedBox(
                      width: 140,
                      height: 140,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          // Green Shape Layer
                          Opacity(
                            opacity: _greenOpacity.value,
                            child: Transform.scale(
                              scale: _greenScale.value,
                              child: Image.asset(
                                'assets/images/logo_green.png',
                                width: 140,
                                height: 140,
                                fit: BoxFit.contain,
                              ),
                            ),
                          ),
                          // Black & Orange Details Layer
                          Opacity(
                            opacity: _detailsOpacity.value,
                            child: Transform.scale(
                              scale: _detailsScale.value,
                              child: Image.asset(
                                'assets/images/logo_details.png',
                                width: 140,
                                height: 140,
                                fit: BoxFit.contain,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  FadeTransition(
                    opacity: _titleOpacity,
                    child: SlideTransition(
                      position: _titleSlide,
                      child: const Text(
                        'SERVE',
                        style: TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.w900,
                          color: AppTheme.textPrimary,
                          letterSpacing: 4.0,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  FadeTransition(
                    opacity: _taglineOpacity,
                    child: SlideTransition(
                      position: _taglineSlide,
                      child: const Text(
                        AppConstants.tagline,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                          color: AppTheme.textSecondary,
                          letterSpacing: 1.5,
                        ),
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}
