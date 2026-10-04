import '../../models/canteen.dart';
import 'api_service.dart';

class ApiCanteenRepository {
  Future<List<Canteen>> getCanteens() async {
    final data = await ApiService.get('/canteens');
    return (data as List).map((json) => Canteen.fromJson(json)).toList();
  }
}
