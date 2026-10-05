import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/canteen.dart';
import '../../providers/session_provider.dart';
import '../../theme/app_theme.dart';
import '../../utils/canteen_switch.dart';
import '../../utils/constants.dart';
import '../../widgets/canteen_option_tile.dart';

/// Choose the night canteen whose menu the student orders from.
class CanteenSelectionScreen extends StatefulWidget {
  /// True when shown right after sign-in (no canteen selected yet).
  final bool isInitialSelection;

  const CanteenSelectionScreen({super.key, this.isInitialSelection = false});

  @override
  State<CanteenSelectionScreen> createState() => _CanteenSelectionScreenState();
}

class _CanteenSelectionScreenState extends State<CanteenSelectionScreen> {
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    context.read<SessionProvider>().loadCanteens();
  }

  Future<void> _select(Canteen canteen) async {
    if (_busy) return;
    setState(() => _busy = true);
    final switched = await switchCanteen(context, canteen);
    if (!mounted) return;
    setState(() => _busy = false);
    if (!switched) return;
    if (widget.isInitialSelection) {
      Navigator.pushNamedAndRemoveUntil(context, AppConstants.routeHome, (route) => false);
    } else {
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<SessionProvider>();
    final selectedId = session.student?.selectedCanteenId;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Night Canteen'),
        automaticallyImplyLeading: !widget.isInitialSelection,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Select where you want to collect your order.',
            style: TextStyle(color: AppTheme.textSecondary, fontSize: 14),
          ),
          const SizedBox(height: 16),
          if (session.canteens.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 48),
              child: Center(
                child: Text(
                  'No night canteens are available right now.',
                  style: TextStyle(color: AppTheme.textSecondary),
                ),
              ),
            ),
          ...session.canteens.map(
            (canteen) => CanteenOptionTile(
              canteen: canteen,
              isSelected: canteen.id == selectedId,
              onTap: () => _select(canteen),
            ),
          ),
        ],
      ),
    );
  }
}
