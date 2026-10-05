import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import '../models/canteen.dart';
import '../models/student.dart';
import '../services/api/api_client.dart';
import '../services/realtime/realtime_service.dart';

enum SessionStatus { loading, signedOut, unregistered, ready }

/// Firebase sign-in + the student's SERVE account (from PostgreSQL) + the
/// list of canteens and the student's selected canteen.
class SessionProvider with ChangeNotifier {
  SessionProvider() {
    _authSubscription = FirebaseAuth.instance.authStateChanges().listen(_onAuthChanged);
    _realtimeSubscription = RealtimeService.instance.stream.listen(_onRealtime);
    // currentUser is settled once Firebase.initializeApp has completed. Resolve
    // from it directly: on web the stream above does not always deliver its
    // initial event. Duplicate resolutions are harmless (latest one wins).
    scheduleMicrotask(() => _onAuthChanged(FirebaseAuth.instance.currentUser));
  }

  final ApiClient _api = ApiClient.instance;
  late final StreamSubscription<User?> _authSubscription;
  late final StreamSubscription<RealtimeEvent> _realtimeSubscription;
  final Completer<void> _initialResolution = Completer<void>();
  int _resolution = 0;

  SessionStatus _status = SessionStatus.loading;
  Student? _student;
  List<Canteen> _canteens = [];
  String? _error;

  SessionStatus get status => _status;
  Student? get student => _student;
  List<Canteen> get canteens => _canteens;
  String? get error => _error;

  /// The student's active canteen; null when none is selected or the selected
  /// canteen has been deactivated (the student must then choose another).
  Canteen? get selectedCanteen {
    final id = _student?.selectedCanteenId;
    for (final canteen in _canteens) {
      if (canteen.id == id) return canteen.isActive ? canteen : null;
    }
    return null;
  }

  /// Hostels that have a night canteen (for the registration form).
  List<String> get hostels {
    final names = <String>{for (final canteen in _canteens) ...canteen.hostelsServed}.toList();
    names.sort();
    return names;
  }

  /// Completes once the initial Firebase session has been resolved.
  Future<void> get ready => _initialResolution.future;

  Future<void> _onAuthChanged(User? user) async {
    final attempt = ++_resolution;
    if (user == null) {
      RealtimeService.instance.disconnect();
      _student = null;
      _status = SessionStatus.signedOut;
      _finishInitialResolution();
      notifyListeners();
      return;
    }
    await _loadAccount(attempt);
  }

  Future<void> _loadAccount(int attempt) async {
    try {
      final body = await _api.get('/api/me');
      if (attempt != _resolution) return;
      final account = body['account'] as Map<String, dynamic>;
      if (account['role'] != 'STUDENT') {
        _error = 'This account is not a student account.';
        await signOut();
        return;
      }
      _student = Student.fromAccount(account);
      await loadCanteens();
      _error = null;
      _status = SessionStatus.ready;
      RealtimeService.instance.connect();
    } on ApiException catch (e) {
      if (attempt != _resolution) return;
      if (e.code == 'ACCOUNT_NOT_REGISTERED') {
        await loadCanteens();
        _status = SessionStatus.unregistered;
      } else {
        _error = e.message;
        await signOut();
        return;
      }
    }
    _finishInitialResolution();
    notifyListeners();
  }

  void _finishInitialResolution() {
    if (!_initialResolution.isCompleted) _initialResolution.complete();
  }

  Future<void> loadCanteens() async {
    try {
      final body = await _api.getPublic('/api/canteens');
      _canteens = (body['canteens'] as List<dynamic>)
          .map((json) => Canteen.fromJson(json as Map<String, dynamic>))
          .toList();
      notifyListeners();
    } on ApiException catch (e) {
      debugPrint('Failed to load canteens: ${e.message}');
    }
  }

  void _onRealtime(RealtimeEvent event) {
    if (event.name != 'canteen:updated' && event.name != 'canteen:order_taking_updated') return;
    final updated = Canteen.fromJson(event.data);
    final index = _canteens.indexWhere((canteen) => canteen.id == updated.id);
    if (index >= 0) {
      _canteens = [..._canteens]..[index] = updated;
      notifyListeners();
    }
  }

  String _friendlyAuthError(FirebaseAuthException e) {
    switch (e.code) {
      case 'invalid-credential':
      case 'wrong-password':
      case 'user-not-found':
        return 'Incorrect email or password.';
      case 'email-already-in-use':
        return 'An account with this email already exists. Sign in instead.';
      case 'weak-password':
        return 'Password must be at least 6 characters.';
      case 'invalid-email':
        return 'Please enter a valid email address.';
      case 'network-request-failed':
        return 'Cannot reach the sign-in service. Check your connection.';
      default:
        return e.message ?? 'Sign-in failed. Try again.';
    }
  }

  /// Signs in and resolves the SERVE account. Returns true when the student
  /// can enter the app (false also when they still need to register).
  Future<bool> signIn(String email, String password) async {
    _error = null;
    try {
      await FirebaseAuth.instance.signInWithEmailAndPassword(email: email.trim(), password: password);
      await _loadAccount(++_resolution);
      return _status == SessionStatus.ready;
    } on FirebaseAuthException catch (e) {
      _error = _friendlyAuthError(e);
      notifyListeners();
      return false;
    }
  }

  /// Creates the Firebase sign-in (if needed) and the SERVE student account.
  Future<bool> register({
    required String name,
    required String rollNumber,
    required String hostel,
    String? email,
    String? password,
  }) async {
    _error = null;
    try {
      if (FirebaseAuth.instance.currentUser == null) {
        await FirebaseAuth.instance.createUserWithEmailAndPassword(email: email!.trim(), password: password!);
      }
      await _api.post('/api/students/register', {'name': name, 'rollNumber': rollNumber, 'hostel': hostel});
      await _loadAccount(++_resolution);
      return _status == SessionStatus.ready;
    } on FirebaseAuthException catch (e) {
      _error = _friendlyAuthError(e);
    } on ApiException catch (e) {
      _error = e.message;
    }
    notifyListeners();
    return false;
  }

  /// Persists the active canteen on the server (the server also moves this
  /// student's live connection to that canteen's updates).
  Future<void> selectCanteen(String canteenId) async {
    final body = await _api.patch('/api/students/me', {'selectedCanteenId': canteenId});
    _student = Student.fromAccount(body['account'] as Map<String, dynamic>);
    notifyListeners();
  }

  Future<void> signOut() async {
    RealtimeService.instance.disconnect();
    await FirebaseAuth.instance.signOut();
    await _onAuthChanged(null);
  }

  @override
  void dispose() {
    _authSubscription.cancel();
    _realtimeSubscription.cancel();
    super.dispose();
  }
}
