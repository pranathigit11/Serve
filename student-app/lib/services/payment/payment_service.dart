class PaymentService {
  // Prepared for future Razorpay integration
  Future<bool> processMockUpiPayment(double amount) async {
    // Simulate payment gateway delay
    await Future.delayed(const Duration(seconds: 2));
    // Always succeed in mock
    return true;
  }
}
