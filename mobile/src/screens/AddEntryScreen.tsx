import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { TextInput, Button, Card, Text, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useFoodContext } from '../context/FoodContext';
import { apiService } from '../services/api';
import { AppColors } from '../theme/colors';

export const AddEntryScreen: React.FC = () => {
  const { addFoodEntry } = useFoodContext();
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    const caloriesNum = parseFloat(calories);
    const proteinNum = parseFloat(protein) || 0;
    const carbsNum = parseFloat(carbs) || 0;
    const fatsNum = parseFloat(fats) || 0;

    if (!foodName.trim() || !calories || caloriesNum <= 0) {
      Alert.alert('Error', 'Please enter a valid food name and calorie count.');
      return;
    }

    addFoodEntry({
      foodName: foodName.trim(),
      calories: caloriesNum,
      protein: proteinNum,
      carbs: carbsNum,
      fats: fatsNum,
    });

    // Clear form
    setFoodName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFats('');

    Alert.alert('Success', `Saved entry for "${foodName}"`);
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        setLoading(true);
        Alert.alert('Processing', 'Uploading and analyzing photo...');

        const nutritionData = await apiService.analyzeImage(result.assets[0].uri);
        setLoading(false);

        if (nutritionData) {
          Alert.alert(
            'Verify and Add Entry',
            `The app identified:\n\n` +
              `Food: ${nutritionData.foodName}\n` +
              `Calories: ${nutritionData.calories.toFixed(0)} kcal\n` +
              `Protein: ${nutritionData.protein.toFixed(1)} g\n` +
              `Carbs: ${nutritionData.carbs.toFixed(1)} g\n` +
              `Fats: ${nutritionData.fats.toFixed(1)} g\n\n` +
              `Do you want to add this entry?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Confirm',
                onPress: () => {
                  addFoodEntry(nutritionData);
                  Alert.alert('Success', 'Entry added from photo!');
                },
              },
            ]
          );
        } else {
          Alert.alert('Error', 'Failed to analyze photo. Please try again.');
        }
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      console.error('Photo error:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>Add Food Entry</Text>
            
            <TextInput
              label="Food Name"
              value={foodName}
              onChangeText={setFoodName}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="food" />}
            />

            <TextInput
              label="Total Calories (kcal)"
              value={calories}
              onChangeText={setCalories}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="fire" />}
            />

            <TextInput
              label="Protein (g)"
              value={protein}
              onChangeText={setProtein}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="dumbbell" />}
            />

            <TextInput
              label="Carbohydrates (g)"
              value={carbs}
              onChangeText={setCarbs}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="bread-slice" />}
            />

            <TextInput
              label="Fats (g)"
              value={fats}
              onChangeText={setFats}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="water" />}
            />

            <View style={styles.buttonRow}>
              <Button
                mode="contained"
                onPress={handleSave}
                style={styles.saveButton}
                contentStyle={styles.buttonContent}
                disabled={loading}
              >
                Save Food Entry
              </Button>
              
              <IconButton
                icon="camera"
                mode="contained"
                size={28}
                onPress={handleTakePhoto}
                disabled={loading}
                style={styles.cameraButton}
                iconColor={AppColors.white}
              />
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: AppColors.white,
    elevation: 4,
    borderRadius: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: AppColors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
    backgroundColor: AppColors.white,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  saveButton: {
    flex: 1,
    backgroundColor: AppColors.accent,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  cameraButton: {
    backgroundColor: AppColors.accent,
    margin: 0,
  },
});
