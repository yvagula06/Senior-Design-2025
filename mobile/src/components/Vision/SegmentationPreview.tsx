/**
 * SegmentationPreview
 *
 * Overlays segmentation quality feedback on top of the captured image.
 *
 * Shows:
 *   - A rounded rectangle guide showing the primary bounding box
 *   - A quality score badge (green / amber / red)
 *   - "Looks good!" or "Retake recommended" banner
 *   - Optional retake recommendation text from the API
 *
 * Usage:
 *   <SegmentationPreview
 *     imageUri="..."
 *     segmentationQuality={0.82}
 *     imageQuality={0.9}
 *     retakeRecommendation={null}
 *     onRetake={() => {}}
 *     onConfirm={() => {}}
 *   />
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_HEIGHT = SCREEN_WIDTH * 0.75;

interface Props {
  imageUri: string;
  segmentationQuality: number;   // 0–1
  imageQuality: number;          // 0–1
  retakeRecommendation: string | null;
  onRetake: () => void;
  onConfirm: () => void;
}

const qualityLabel = (score: number): { text: string; color: string } => {
  if (score >= 0.75) return { text: 'Great', color: '#00D4AA' };
  if (score >= 0.5) return { text: 'OK', color: '#FFA726' };
  return { text: 'Poor', color: '#EF5350' };
};

export const SegmentationPreview: React.FC<Props> = ({
  imageUri,
  segmentationQuality,
  imageQuality,
  retakeRecommendation,
  onRetake,
  onConfirm,
}) => {
  const segQ = qualityLabel(segmentationQuality);
  const imgQ = qualityLabel(imageQuality);
  const shouldRetake = !!retakeRecommendation;

  return (
    <View style={styles.container}>
      {/* Image + guide overlay */}
      <View style={styles.imageWrapper}>
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />

        {/* Segmentation guide box */}
        <View style={styles.guideBox} pointerEvents="none" />

        {/* Segmentation quality badge */}
        <View style={[styles.badge, { backgroundColor: segQ.color + 'CC' }]}>
          <Text style={styles.badgeText}>Seg: {segQ.text}</Text>
        </View>

        {/* Image quality badge */}
        <View style={[styles.imgBadge, { backgroundColor: imgQ.color + 'CC' }]}>
          <Text style={styles.badgeText}>Img: {imgQ.text}</Text>
        </View>
      </View>

      {/* Feedback banner */}
      <View
        style={[
          styles.banner,
          shouldRetake ? styles.bannerWarn : styles.bannerOk,
        ]}
      >
        <Text style={styles.bannerIcon}>{shouldRetake ? '⚠️' : '✅'}</Text>
        <Text style={styles.bannerText}>
          {shouldRetake
            ? retakeRecommendation
            : 'Looks good! Food detected clearly.'}
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.retakeBtn} onPress={onRetake}>
          <Text style={styles.retakeBtnText}>🔄 Retake</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmBtn, shouldRetake && styles.confirmBtnWarn]}
          onPress={onConfirm}
        >
          <Text style={styles.confirmBtnText}>
            {shouldRetake ? 'Use anyway →' : 'Analyse →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0A0A1A',
    borderRadius: 16,
    overflow: 'hidden',
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: PREVIEW_HEIGHT,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  guideBox: {
    position: 'absolute',
    top: '10%',
    left: '10%',
    width: '80%',
    height: '80%',
    borderWidth: 2,
    borderColor: '#00D4AACC',
    borderRadius: 12,
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  imgBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  bannerOk: {
    backgroundColor: '#0D2E1E',
  },
  bannerWarn: {
    backgroundColor: '#2E1A0D',
  },
  bannerIcon: {
    fontSize: 18,
    marginTop: 1,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    color: '#DDD',
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  retakeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#555',
    alignItems: 'center',
  },
  retakeBtnText: {
    fontSize: 14,
    color: '#CCC',
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#00D4AA',
    alignItems: 'center',
  },
  confirmBtnWarn: {
    backgroundColor: '#FFA726',
  },
  confirmBtnText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '700',
  },
});
