/**
 * PlateReferenceSelector
 *
 * Lets the user pick the plate/container type that their food is served on so
 * the backend can compute a real-world pixel scale via known plate diameters.
 *
 * Also exposes an optional numeric input for a custom diameter.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import type { PlateType } from '../../types/vision';

interface PlateOption {
  type: PlateType;
  label: string;
  subtitle: string;
  diameterCm: number;
  emoji: string;
}

const PLATE_OPTIONS: PlateOption[] = [
  {
    type: 'small_plate',
    label: 'Small Plate',
    subtitle: '~20 cm',
    diameterCm: 20,
    emoji: '🍽',
  },
  {
    type: 'medium_plate',
    label: 'Dinner Plate',
    subtitle: '~25 cm',
    diameterCm: 25,
    emoji: '🍽',
  },
  {
    type: 'large_plate',
    label: 'Large Plate',
    subtitle: '~30 cm',
    diameterCm: 30,
    emoji: '🍽',
  },
  {
    type: 'bowl',
    label: 'Bowl',
    subtitle: '~15 cm',
    diameterCm: 15,
    emoji: '🥣',
  },
  {
    type: 'cup',
    label: 'Cup / Mug',
    subtitle: '~8 cm',
    diameterCm: 8,
    emoji: '☕',
  },
  {
    type: 'container',
    label: 'Container',
    subtitle: 'custom size',
    diameterCm: 18,
    emoji: '📦',
  },
];

interface Props {
  selectedType: PlateType | null;
  customDiameterCm: number | null;
  onSelect: (type: PlateType, diameterCm: number) => void;
}

export const PlateReferenceSelector: React.FC<Props> = ({
  selectedType,
  customDiameterCm,
  onSelect,
}) => {
  const [customInput, setCustomInput] = useState<string>(
    customDiameterCm !== null ? String(customDiameterCm) : '',
  );

  const handleSelect = (opt: PlateOption) => {
    if (opt.type === 'container') {
      const val = parseFloat(customInput);
      onSelect(opt.type, isNaN(val) ? opt.diameterCm : val);
    } else {
      onSelect(opt.type, opt.diameterCm);
    }
  };

  const handleCustomChange = (text: string) => {
    setCustomInput(text);
    if (selectedType === 'container') {
      const val = parseFloat(text);
      if (!isNaN(val) && val > 0) {
        onSelect('container', val);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>What is your food served on?</Text>
      <Text style={styles.subheading}>
        Helps us estimate real-world size accurately.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.grid}
      >
        {PLATE_OPTIONS.map((opt) => {
          const isSelected = selectedType === opt.type;
          return (
            <TouchableOpacity
              key={opt.type}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => handleSelect(opt)}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{opt.emoji}</Text>
              <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                {opt.label}
              </Text>
              <Text style={styles.cardSubtitle}>{opt.subtitle}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selectedType === 'container' && (
        <View style={styles.customRow}>
          <Text style={styles.customLabel}>Container diameter (cm):</Text>
          <TextInput
            style={styles.customInput}
            value={customInput}
            onChangeText={handleCustomChange}
            keyboardType="decimal-pad"
            placeholder="e.g. 18"
            placeholderTextColor="#999"
            maxLength={5}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  heading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  subheading: {
    fontSize: 13,
    color: '#AAA',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  grid: {
    paddingHorizontal: 12,
    gap: 10,
  },
  card: {
    width: 90,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#1E1E2E',
    borderWidth: 2,
    borderColor: 'transparent',
    marginHorizontal: 4,
  },
  cardSelected: {
    borderColor: '#00D4AA',
    backgroundColor: '#0D1F2D',
  },
  emoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DDD',
    textAlign: 'center',
  },
  cardLabelSelected: {
    color: '#00D4AA',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#777',
    marginTop: 2,
    textAlign: 'center',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  customLabel: {
    flex: 1,
    fontSize: 14,
    color: '#CCC',
  },
  customInput: {
    width: 80,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    backgroundColor: '#1A1A2A',
    color: '#FFF',
    paddingHorizontal: 10,
    fontSize: 14,
    textAlign: 'center',
  },
});
