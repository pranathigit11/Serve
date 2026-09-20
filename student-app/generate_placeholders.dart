import 'dart:io';

import 'package:image/image.dart' as img;

void createPlaceholder(String name, int r, int g, int b) {
  final image = img.Image(width: 400, height: 400);
  img.fill(image, color: img.ColorRgb8(r, g, b));
  img.drawString(
    image,
    name,
    font: img.arial24,
    x: 200,
    y: 200,
    color: img.ColorRgb8(0, 0, 0),
  );
  File('assets/images/food/$name.jpg').writeAsBytesSync(img.encodeJpg(image));
}

void main() {
  // Omelette (Yellow)
  createPlaceholder('cat_omelette', 255, 249, 196);
  // Juice (Pink)
  createPlaceholder('cat_juice', 255, 205, 210);
  // Dosa (Orange)
  createPlaceholder('cat_dosa', 255, 224, 178);
  // Beverage (Brown)
  createPlaceholder('cat_beverage', 215, 204, 200);

  print('Generated placeholder images!');
}
