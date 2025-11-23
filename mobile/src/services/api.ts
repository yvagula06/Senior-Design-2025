import axios from 'axios';
import { NutritionInfo } from '../types/nutrition';

const API_BASE_URL = 'https://csu-nutrition-arda.free.beeceptor.com';

export const apiService = {
  async analyzeImage(imageUri: string): Promise<NutritionInfo | null> {
    try {
      const formData = new FormData();
      
      // Create a file object from the image URI
      const filename = imageUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('image', {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      const response = await axios.post(`${API_BASE_URL}/analyzeImage`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200 && response.data) {
        return {
          foodName: response.data.foodName || 'Unknown Food',
          calories: Number(response.data.calories) || 0,
          protein: Number(response.data.protein) || 0,
          carbs: Number(response.data.carbs) || 0,
          fats: Number(response.data.fats) || 0,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error analyzing image:', error);
      return null;
    }
  },
};
