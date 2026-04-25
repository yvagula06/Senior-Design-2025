/**
 * ReferenceObjectSelector
 *
 * Lets the user place a common reference object next to their food so the
 * backend can compute a real-world pixel scale.
 *
 * For 'custom' the user can enter the object's known dimension in cm.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import type { ReferenceObjectType } from '../../types/vision';

interface RefOption {
  type: ReferenceObjectType;
  label: string;
  detail: string;
  sizeCm: number;
  emoji: string;
}

const REF_OPTIONS: RefOption[] = [
  {
    type: 'credit_card',
    label: 'Credit Card',
    detail: '8.56 × 5.4 cm',
    sizeCm: 8.56,
    emoji: '💳',
  },
  {
    type: 'fork',
    label: 'Fork',
    detail: '~19 cm long',
    sizeCm: 19,
    emoji: '🍴',
  },
  {
    type: 'spoon',
    label: 'Spoon',
    detail: '~18 cm long',
    sizeCm: 18,
    emoji: '🥄',
  },
  {
    type: 'soda_can',
    label: 'Soda Can',
    detail: '6.6 cm diam.',
    sizeCm: 6.6,
    emoji: '🥤',
  },
  {
    type: 'custom',
    label: 'Custom',
    detail: 'enter size',
    sizeCm: 10,
    emoji: '📏',
  },
];

interface Props {
  selectedType: ReferenceObjectType | null;
  customSizeCm: number | null;
  onSelect: (type: ReferenceObjectType, sizeCm: number) => void;
}

export const ReferenceObjectSelector: React.FC<Props> = ({
  selectedType,
  customSizeCm,
  onSelect,
}) => {
  const [customInput, setCustomInput] = useState<string>(
    customSizeCm !== null ? String(customSizeCm) : '',
  );

  const handleSelect = (opt: RefOption) => {
    if (opt.type === 'custom') {
      const val = parseFloat(customInput);
      onSelect(opt.type, isNaN(val) ? opt.sizeCm : val);
    } else {
      onSelect(opt.type, opt.sizeCm);
    }
  };

  const handleCustomChange = (text: string) => {
    setCustomInput(text);
    if (selectedType === 'custom') {
      const val = parseFloat(text);
      if (!isNaN(val) && val > 0) {
        onSelect('custom', val);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Place a reference object next to your food</Text>
      <Text style={styles.subheading}>
        This gives us a real-world scale for a more accurate estimate.
      </Text>

      <View style={styles.list}>
        {REF_OPTIONS.map((opt) => {
          const isSelected = selectedType === opt.type;
          return (
            <TouchableOpacity
              key={opt.type}
              style={[styles.row, isSelected && styles.rowSelected]}
              onPress={() => handleSelect(opt)}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{opt.emoji}</Text>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, isSelected && styles.rowLabelSelected]}>
                  {opt.label}
                </Text>
                <Text style={styles.rowDetail}>{opt.detail}</Text>
              </View>
              {isSelected && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedType === 'custom' && (
        <View style={styles.customRow}>
          <Text style={styles.customLabel}>Object size (cm):</Text>
          <TextInput
            style={styles.customInput}
            value={customInput}
            onChangeText={handleCustomChange}
            keyboardType="decimal-pad"
            placeholder="e.g. 15"
            placeholderTextColor="#999"
            maxLength={6}
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
  list: {
    paddingHorizontal: 12,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#1E1E2E',
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 6,
  },
  rowSelected: {
    borderColor: '#00D4AA',
    backgroundColor: '#0D1F2D',
  },
  emoji: {
    fontSize: 24,
    marginRight: 12,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DDD',
  },
  rowLabelSelected: {
    color: '#00D4AA',
  },
  rowDetail: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  check: {
    fontSize: 18,
    color: '#00D4AA',
    fontWeight: '700',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
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
