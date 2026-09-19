import 'dart:io';

import 'package:image/image.dart' as img;

void main() {
  final file = File('assets/images/logo.png');
  if (!file.existsSync()) {
    print('logo.png not found!');
    return;
  }

  final bytes = file.readAsBytesSync();
  final image = img.decodeImage(bytes);

  if (image == null) {
    print('Could not decode image!');
    return;
  }

  // Create two new blank images
  final greenLayer = img.Image(
    width: image.width,
    height: image.height,
    numChannels: 4,
  );
  final detailsLayer = img.Image(
    width: image.width,
    height: image.height,
    numChannels: 4,
  );

  for (var p in image) {
    if (p.a == 0) continue; // Transparent, leave blank in both

    bool isDetails = false;

    // Black linework heuristic (dark pixels)
    if (p.r < 100 && p.g < 100 && p.b < 100) {
      isDetails = true;
    }
    // Orange heuristic (Red is significantly higher than Green/Blue)
    else if (p.r > p.g + 30 && p.r > p.b + 50) {
      isDetails = true;
    }
    // Very dark green might be misclassified, but black is usually < 50
    // Anti-aliased black lines on green background might have R=60, G=80, B=40. Let's check luminance maybe?
    // Let's just say if it's mostly green (G > R and G > B), it's green layer.
    else if (p.g > p.r && p.g > p.b) {
      isDetails = false;
    }
    // Catch-all for very light antialiasing or edges
    else {
      // If it's dark, details. Else green.
      if (p.r + p.g + p.b < 300) {
        isDetails = true;
      } else {
        isDetails = false;
      }
    }

    if (isDetails) {
      detailsLayer.setPixelRgba(p.x, p.y, p.r, p.g, p.b, p.a);
    } else {
      greenLayer.setPixelRgba(p.x, p.y, p.r, p.g, p.b, p.a);
    }
  }

  File('assets/images/logo_green.png')
      .writeAsBytesSync(img.encodePng(greenLayer));
  File('assets/images/logo_details.png')
      .writeAsBytesSync(img.encodePng(detailsLayer));
  print('Logo split into green and details layers successfully!');
}
