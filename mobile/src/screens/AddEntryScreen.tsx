import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Pressable,
} from 'react-native';
import { TextInput, Button, Card, Text, IconButton, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as Animatable from 'react-native-animatable';
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
  const [successAnimation, setSuccessAnimation] = useState(false);
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const cardRef = useRef<any>(null);

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSave = () => {
    const caloriesNum = parseFloat(calories);
    const proteinNum = parseFloat(protein) || 0;
    const carbsNum = parseFloat(carbs) || 0;
    const fatsNum = parseFloat(fats) || 0;

    if (!foodName.trim() || !calories || caloriesNum <= 0) {
      cardRef.current?.shake(800);
      Alert.alert('Error', 'Please enter a valid food name and calorie count.');
      return;
    }

    animateButton();
    addFoodEntry({
      foodName: foodName.trim(),
      calories: caloriesNum,
      protein: proteinNum,
      carbs: carbsNum,
      fats: fatsNum,
    });

    // Success animation
    setSuccessAnimation(true);
    cardRef.current?.pulse(600);
    
    setTimeout(() => {
      // Clear form
      setFoodName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFats('');
      setSuccessAnimation(false);
    }, 1000);

    Alert.alert('Success', `Saved entry for "${foodName}"`, [{ text: 'OK' }]);
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
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animatable.View
          animation="fadeInDown"
          duration={800}
          delay={200}
        >
          <Card style={styles.card} elevation={8}>
            <Card.Content>
              <Animatable.View animation="fadeIn" delay={400}>
                <Text style={styles.title}>🍽️ Add Food Entry</Text>
                <Text style={styles.subtitle}>Track your nutrition intake</Text>
              </Animatable.View>
              
              <Animatable.View animation="fadeInUp" delay={500}>
                <TextInput
                  label="Food Name"
                  value={foodName}
                  onChangeText={setFoodName}
                  mode="outlined"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  activeOutlineColor={AppColors.accent}
                  left={<TextInput.Icon icon="food" />}
                />
              </Animatable.View>

              <Animatable.View animation="fadeInUp" delay={600}>
                <TextInput
                  label="Total Calories (kcal)"
                  value={calories}
                  onChangeText={setCalories}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  activeOutlineColor={AppColors.accent}
                  left={<TextInput.Icon icon="fire" />}
                />
              </Animatable.View>

              <View style={styles.macrosContainer}>
                <Animatable.View animation="fadeInUp" delay={700} style={styles.macroInput}>
                  <TextInput
                    label="Protein (g)"
                    value={protein}
                    onChangeText={setProtein}
                    keyboardType="numeric"
                    mode="outlined"
                    style={styles.input}
                    outlineStyle={styles.inputOutline}
                    activeOutlineColor={AppColors.accent}
                    left={<TextInput.Icon icon="dumbbell" />}
                  />
                </Animatable.View>

                <Animatable.View animation="fadeInUp" delay={750} style={styles.macroInput}>
                  <TextInput
                    label="Carbs (g)"
                    value={carbs}
                    onChangeText={setCarbs}
                    keyboardType="numeric"
                    mode="outlined"
                    style={styles.input}
                    outlineStyle={styles.inputOutline}
                    activeOutlineColor={AppColors.accent}
                    left={<TextInput.Icon icon="bread-slice" />}
                  />
                </Animatable.View>
              </View>

              <Animatable.View animation="fadeInUp" delay={800}>
                <TextInput
                  label="Fats (g)"
                  value={fats}
                  onChangeText={setFats}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  activeOutlineColor={AppColors.accent}
                  left={<TextInput.Icon icon="water" />}
                />
              </Animatable.View>

              <Animatable.View 
                ref={cardRef}
                animation="fadeInUp" 
                delay={900}
              >
                <View style={styles.buttonRow}>
                  <Animated.View style={[styles.saveButtonContainer, { transform: [{ scale: scaleAnim }] }]}>
                    <Button
                      mode="contained"
                      onPress={handleSave}
                      style={[
                        styles.saveButton,
                        successAnimation && styles.successButton
                      ]}
                      contentStyle={styles.buttonContent}
                      disabled={loading}
                      icon={successAnimation ? "check-circle" : "content-save"}
                      labelStyle={styles.buttonLabel}
                    >
                      {successAnimation ? 'Saved!' : 'Save Entry'}
                    </Button>
                  </Animated.View>
                  
                  <Pressable
                    onPress={handleTakePhoto}
                    disabled={loading}
                    style={({ pressed }) => [
                      styles.cameraButton,
                      pressed && styles.cameraButtonPressed
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color={AppColors.white} />
                    ) : (
                      <IconButton
                        icon="camera"
                        size={28}
                        iconColor={AppColors.white}
                        style={styles.cameraIcon}
                      />
                    )}
                  </Pressable>
                </View>
              </Animatable.View>
            </Card.Content>
          </Card>
        </Animatable.View>
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
    padding: 20,
    paddingTop: 24,
  },
  card: {
    backgroundColor: AppColors.white,
    borderRadius: 20,
    shadowColor: AppColors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: AppColors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.mediumGray,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
    backgroundColor: AppColors.white,
  },
  inputOutline: {
    borderRadius: 12,
    borderWidth: 2,
  },
  macrosContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  macroInput: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  saveButtonContainer: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: AppColors.accent,
    borderRadius: 12,
    elevation: 4,
  },
  successButton: {
    backgroundColor: '#4CAF50',
  },
  buttonContent: {
    paddingVertical: 10,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  cameraButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cameraButtonPressed: {
    backgroundColor: AppColors.accent,
    transform: [{ scale: 0.95 }],
  },
  cameraIcon: {
    margin: 0,
  },
});
