import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/session_provider.dart';
import 'constants.dart';

/// Routes a signed-in student into the app: canteen selection first if they
/// have not chosen an (active) canteen yet, otherwise the home screen.
void enterStudentApp(BuildContext context) {
  final session = context.read<SessionProvider>();
  if (session.selectedCanteen == null) {
    Navigator.pushNamedAndRemoveUntil(context, AppConstants.routeCanteenSelection, (route) => false, arguments: true);
  } else {
    Navigator.pushNamedAndRemoveUntil(context, AppConstants.routeHome, (route) => false);
  }
}
