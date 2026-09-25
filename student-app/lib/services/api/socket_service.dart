import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../../utils/config.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  IO.Socket? socket;
  
  // Basic pub/sub for UI updates
  final Map<String, List<Function>> _listeners = {};

  void connect(String studentId, String canteenId) {
    if (socket != null && socket!.connected) return;

    // Use a clean URL without /api path
    final socketUrl = AppConfig.apiBaseUrl.replaceAll('/api', '');

    socket = IO.io(socketUrl, IO.OptionBuilder()
      .setTransports(['websocket'])
      .disableAutoConnect()
      .build());

    socket!.onConnect((_) {
      print('Socket connected');
      socket!.emit('join:student', studentId);
      socket!.emit('join:canteen', canteenId);
    });

    socket!.onDisconnect((_) => print('Socket disconnected'));
    
    // Listen to events and dispatch
    socket!.on('order:created', (data) => _dispatch('order:created', data));
    socket!.on('order:status_updated', (data) => _dispatch('order:status_updated', data));
    socket!.on('order:cancelled', (data) => _dispatch('order:cancelled', data));
    socket!.on('canteen:order_taking_updated', (data) => _dispatch('canteen:order_taking_updated', data));
    socket!.on('menu:availability_updated', (data) => _dispatch('menu:availability_updated', data));

    socket!.connect();
  }
  
  void joinCanteen(String canteenId) {
    socket?.emit('join:canteen', canteenId);
  }
  
  void leaveCanteen(String canteenId) {
    socket?.emit('leave:canteen', canteenId);
  }

  void on(String event, Function callback) {
    if (!_listeners.containsKey(event)) {
      _listeners[event] = [];
    }
    if (!_listeners[event]!.contains(callback)) {
      _listeners[event]!.add(callback);
    }
  }

  void off(String event, Function callback) {
    _listeners[event]?.remove(callback);
  }

  void _dispatch(String event, dynamic data) {
    if (_listeners.containsKey(event)) {
      for (var callback in _listeners[event]!) {
        callback(data);
      }
    }
  }

  void disconnect() {
    socket?.disconnect();
    socket = null;
    _listeners.clear();
  }
}

final socketService = SocketService();
