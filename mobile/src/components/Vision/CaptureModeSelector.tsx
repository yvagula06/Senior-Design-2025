/**
 * CaptureModeSelector
 *
 * Horizontal card row that lets the user pick their preferred capture/
 * estimation method before taking the photo(s).
 *
 * Mode accuracy indicators help the user choose:
 *   - Depth Scan (LiDAR)       → highest accuracy, device gated
 *   - Plate Reference          → good accuracy
 *   - Reference Object         → good accuracy
 *   - Multi-Angle              → medium accuracy
 *   - Single Photo             → lowest accuracy
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { CaptureMode, NormalCameraMode } from '../../types/vision';

type AnyMode = CaptureMode | NormalCameraMode;

interface ModeConfig {
  id: AnyMode;
  label: string;
  description: string;
  emoji: string;
  accuracyLabel: string;
  accuracyColor: string;
  requiresLiDAR?: boolean;
}

const MODE_CONFIGS: ModeConfig[] = [
  {
    id: 'depth',
    label: 'Depth Scan',
    description: 'Uses LiDAR for the most accurate 3-D volume',
    emoji: '📡',
    accuracyLabel: 'Highest',
    accuracyColor: '#00D4AA',
    requiresLiDAR: true,
  },
  {
    id: 'plate_reference',
    label: 'Plate Reference',
    description: 'Tell us the plate size — great everyday accuracy',
    emoji: '🍽',
    accuracyLabel: 'High',
    accuracyColor: '#4CAF50',
  },
  {
    id: 'reference_object',
    label: 'Reference Object',
    description: 'Place a card or utensil next to the food',
    emoji: '💳',
    accuracyLabel: 'High',
    accuracyColor: '#4CAF50',
  },
  {
    id: 'multi_angle',
    label: 'Multi-Angle',
    description: 'Take a top shot + one angled photo',
    emoji: '📐',
    accuracyLabel: 'Medium',
    accuracyColor: '#FFA726',
  },
  {
    id: 'basic_single',
    label: 'Quick Snap',
    description: 'Single photo — fastest but less precise',
    emoji: '📸',
    accuracyLabel: 'Estimate',
    accuracyColor: '#EF5350',
  },
];

interface Props {
  selectedMode: AnyMode;
  hasLiDAR: boolean;
  onSelect: (mode: AnyMode) => void;
}

export const CaptureModeSelector: React.FC<Props> = ({
  selectedMode,
  hasLiDAR,
  onSelect,
}) => (
  <View style={styles.list}>
    {MODE_CONFIGS.map((cfg) => {
      const disabled = cfg.requiresLiDAR && !hasLiDAR;
      const isSelected = selectedMode === cfg.id;

      return (
        <TouchableOpacity
          key={cfg.id}
          style={[
            styles.card,
            isSelected && styles.cardSelected,
            disabled && styles.cardDisabled,
          ]}
          onPress={() => !disabled && onSelect(cfg.id)}
          activeOpacity={disabled ? 1 : 0.75}
        >
          <Text style={styles.emoji}>{cfg.emoji}</Text>
          <View style={styles.textBlock}>
            <Text
              style={[
                styles.label,
                isSelected && styles.labelSelected,
                disabled && styles.labelDisabled,
              ]}
            >
              {cfg.label}
            </Text>
            <Text style={styles.description} numberOfLines={2}>
              {disabled ? 'LiDAR required on this device' : cfg.description}
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: disabled ? '#2A2A2A' : cfg.accuracyColor + '22' },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: disabled ? '#555' : cfg.accuracyColor },
              ]}
            >
              {disabled ? 'N/A' : cfg.accuracyLabel}
            </Text>
          </View>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  list: {
    width: '100%',
    gap: 10,
    paddingVertical: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#1A1A2E',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  cardSelected: {
    borderColor: '#00D4AA',
    backgroundColor: '#0D1F2D',
  },
  cardDisabled: {
    opacity: 0.4,
  },
  emoji: {
    fontSize: 26,
    width: 34,
    textAlign: 'center',
  },
  textBlock: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DDD',
    marginBottom: 2,
  },
  labelSelected: {
    color: '#00D4AA',
  },
  labelDisabled: {
    color: '#555',
  },
  description: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
