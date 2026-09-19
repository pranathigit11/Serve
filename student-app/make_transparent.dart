import 'dart:io';
import 'package:image/image.dart' as img;

void main() {
  final file = File('assets/images/logo.png');
  if (!file.existsSync()) {
    print('File not found!');
    return;
  }
  
  final bytes = file.readAsBytesSync();
  final image = img.decodeImage(bytes);
  
  if (image == null) {
    print('Could not decode image!');
    return;
  }

  // Iterate over all pixels
  for (var p in image) {
    // If the pixel is very close to white
    if (p.r > 240 && p.g > 240 && p.b > 240) {
      // Calculate how close to white it is (255 is pure white)
      // The closer to white, the more transparent it becomes.
      // For simplicity, just make anything > 240 fully transparent.
      p.a = 0;
    }
  }

  final outBytes = img.encodePng(image);
  file.writeAsBytesSync(outBytes);
  print('Transparent image generated successfully!');
}
