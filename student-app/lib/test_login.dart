import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'firebase_options.dart';

void main() async {
  try {
    await Firebase.initializeApp(options: DefaultFirebaseOptions.web);
    final cred = await FirebaseAuth.instance.signInWithEmailAndPassword(
      email: 'serve.test@gmail.com',
      password: 'ServeTest@123'
    );
    print('Firebase User Email: ${cred.user?.email}');
    print('Firebase User UID: ${cred.user?.uid}');
    print('Provider ID: ${cred.additionalUserInfo?.providerId}');
  } catch(e) {
    print('Error: $e');
  }
}
