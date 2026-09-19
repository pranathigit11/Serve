import 'dart:io';

import 'package:image/image.dart' as img;

void main() {
  // Image 1 (Sandwich, Roll, Omelette, Juice)
  final file1 = File(
    '/Users/krutthiikaaa/.gemini/antigravity-ide/brain/50d6a070-45d7-471f-9b52-a0e807ee2d5b/.user_uploaded/media_1789817501631.jpg',
  );
  final image1 = img.decodeImage(file1.readAsBytesSync())!;

  final w1 = image1.width ~/ 2;
  final h1 = image1.height ~/ 2;

  // Actually we need to account for the white border/padding if any, but a simple quadrant crop is a good start.
  // We'll crop slightly inside to avoid borders if they exist, but simple crop is fine.

  final sandwich1 = img.copyCrop(image1, x: 0, y: 0, width: w1, height: h1);
  final roll1 = img.copyCrop(image1, x: w1, y: 0, width: w1, height: h1);
  final omelette = img.copyCrop(image1, x: 0, y: h1, width: w1, height: h1);
  final juice = img.copyCrop(image1, x: w1, y: h1, width: w1, height: h1);

  File('assets/images/food/cat_sandwich.jpg')
      .writeAsBytesSync(img.encodeJpg(sandwich1));
  File('assets/images/food/cat_roll.jpg')
      .writeAsBytesSync(img.encodeJpg(roll1));
  File('assets/images/food/cat_omelette.jpg')
      .writeAsBytesSync(img.encodeJpg(omelette));
  File('assets/images/food/cat_juice.jpg')
      .writeAsBytesSync(img.encodeJpg(juice));

  // Image 2 (Sandwich, Roll, Dosa, Beverage)
  final file2 = File(
    '/Users/krutthiikaaa/.gemini/antigravity-ide/brain/50d6a070-45d7-471f-9b52-a0e807ee2d5b/.user_uploaded/media_1789817509527.jpg',
  );
  final image2 = img.decodeImage(file2.readAsBytesSync())!;

  final w2 = image2.width ~/ 2;
  final h2 = image2.height ~/ 2;

  final dosa = img.copyCrop(image2, x: 0, y: h2, width: w2, height: h2);
  final beverage = img.copyCrop(image2, x: w2, y: h2, width: w2, height: h2);

  File('assets/images/food/cat_dosa.jpg').writeAsBytesSync(img.encodeJpg(dosa));
  File('assets/images/food/cat_beverage.jpg')
      .writeAsBytesSync(img.encodeJpg(beverage));

  print('Cropped and saved all category images successfully!');
}
