import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../config/app_config.dart';

class RealtimeEvent {
  final String name;
  final Map<String, dynamic> data;
  RealtimeEvent(this.name, this.data);
}

/// Authenticated Socket.IO connection. The server places the socket in the
/// student's private room and the public room of their selected canteen; the
/// app never chooses rooms itself. A fresh ID token is sent on every connect.
class RealtimeService {
  RealtimeService._();
  static final RealtimeService instance = RealtimeService._();

  static const events = [
    'order:status_updated',
    'order:cancelled',
    'menu:item_updated',
    'menu:item_deleted',
    'menu:availability_updated',
    'menu:category_updated',
    'canteen:updated',
    'canteen:order_taking_updated',
    'notification:created',
  ];

  io.Socket? _socket;
  final _events = StreamController<RealtimeEvent>.broadcast();
  final _reconnects = StreamController<void>.broadcast();

  Stream<RealtimeEvent> get stream => _events.stream;

  /// Fires after a reconnect so listeners can reload missed state.
  Stream<void> get reconnects => _reconnects.stream;

  void connect() {
    if (_socket != null) return;
    final socket = io.io(
      AppConfig.apiBaseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .enableReconnection()
          .setAuthFn((callback) {
            final user = FirebaseAuth.instance.currentUser;
            if (user == null) return callback({});
            user.getIdToken().then((token) => callback({'token': token})).catchError((_) => callback({}));
          })
          .build(),
    );
    for (final name in events) {
      socket.on(name, (data) {
        if (data is Map) _events.add(RealtimeEvent(name, Map<String, dynamic>.from(data)));
      });
    }
    var connectedBefore = false;
    socket.onConnect((_) {
      if (connectedBefore) _reconnects.add(null);
      connectedBefore = true;
    });
    socket.onConnectError((error) => debugPrint('Realtime connection error: $error'));
    socket.connect();
    _socket = socket;
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
  }
}
