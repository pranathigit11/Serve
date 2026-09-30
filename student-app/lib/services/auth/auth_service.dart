import 'package:firebase_auth/firebase_auth.dart';
import '../api/api_service.dart';

class AuthService {
  static final FirebaseAuth _auth = FirebaseAuth.instance;

  static User? get currentUser => _auth.currentUser;

  static Stream<User?> get authStateChanges => _auth.authStateChanges();

  static Future<void> init() async {
    _auth.idTokenChanges().listen((User? user) async {
      if (user != null) {
        final token = await user.getIdToken();
        if (token != null) {
          ApiService.setToken(token);
        }
      } else {
        ApiService.clearToken();
      }
    });
  }

  static Future<UserCredential> signInWithEmailAndPassword(String email, String password) async {
    return await _auth.signInWithEmailAndPassword(email: email, password: password);
  }

  static Future<UserCredential> createUserWithEmailAndPassword(String email, String password) async {
    return await _auth.createUserWithEmailAndPassword(email: email, password: password);
  }

  static Future<void> signOut() async {
    await _auth.signOut();
    ApiService.clearToken();
  }

  static Future<String?> getToken({bool forceRefresh = false}) async {
    return await currentUser?.getIdToken(forceRefresh);
  }
}
