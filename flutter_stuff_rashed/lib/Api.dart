// lib/api_service.dart

import 'package:http/http.dart' as http;
import 'dart:convert'; // For jsonDecode
import 'package:image_picker/image_picker.dart'; // To use the XFile type

class ApiService {
  // Replace this URL with the actual URL of your backend endpoint
  static const String _baseUrl =
      'https://csu-nutrition-arda.free.beeceptor.com'; // <-- PASTE YOUR URL HERE
  Future<Map<String, dynamic>?> analyzeImage(XFile imageFile) async {
    try {
      // Define the specific endpoint for image analysis
      var uri = Uri.parse('$_baseUrl/analyzeImage');

      // Create a multipart request, which is used for sending files
      var request = http.MultipartRequest('POST', uri)
        ..files.add(
          await http.MultipartFile.fromPath(
            'image', // This is the 'field name' your backend expects for the file
            imageFile.path,
          ),
        );

      // Send the request and wait for the response
      var response = await request.send();

      if (response.statusCode == 200) {
        // If the server returns a 200 OK response, parse the JSON
        final responseBody = await response.stream.bytesToString();
        return jsonDecode(responseBody);
      } else {
        // If the server did not return a 200 OK response,
        // print the error and return null.
        print('Server error: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      // If an exception occurs during the request, print it and return null
      print('Error sending image: $e');
      return null;
    }
  }
}
