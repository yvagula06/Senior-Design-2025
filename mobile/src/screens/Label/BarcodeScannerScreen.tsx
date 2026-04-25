/**
 * BarcodeScannerScreen
 *
 * Scans UPC / EAN barcodes using expo-camera (Expo Go compatible),
 * then looks up nutrition via Open Food Facts.
 * Results can be saved directly to the daily food log.
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius, Spacing, Typography } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { lookupBarcode, BarcodeProduct } from '../../services/barcode';
import { useFoodContext } from '../../context/FoodContext';
import { Toast } from '../../components';
import type { LabelStackNavigationProp } from '../../navigation/types';

type ScanState = 'scanning' | 'loading' | 'result' | 'error';

export const BarcodeScannerScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<LabelStackNavigationProp>();
  const { addLabelEntry } = useFoodContext();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    if (!permission) requestPermission();
  }, []);

  const handleBarcode = useCallback(
    async (barcode: string) => {
      if (scanState !== 'scanning' || barcode === lastScanned) return;
      setLastScanned(barcode);
      setScanState('loading');
      try {
        const result = await lookupBarcode(barcode);
        setProduct(result);
        setScanState('result');
      } catch (err) {
        setErrorMsg(typeof err === 'string' ? err : 'Lookup failed. Try again.');
        setScanState('error');
      }
    },
    [scanState, lastScanned],
  );

  const onBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (result.data) handleBarcode(result.data);
    },
    [handleBarcode],
  );

  const handleSave = () => {
    if (!product) return;
    try {
      addLabelEntry({
        dishName: product.productName,
        matchedDish: `${product.brand ? product.brand + ' - ': ''}${product.productName}`,
        calories: product.nutrition.calories,
        protein: product.nutrition.protein_g,
        carbs: product.nutrition.carbs_g,
        fats: product.nutrition.fat_g,
        confidence: 0.95,
        fiber: product.nutrition.fiber_g,
        sugar: product.nutrition.sugar_g,
        sodium: product.nutrition.sodium_mg,
      });
      setIsSaved(true);
      setToastMessage(`Added "${product.productName}" to your daily totals!`);
      setToastType('success');
      setToastVisible(true);
    } catch {
      setToastMessage('Failed to save. Please try again.');
      setToastType('error');
      setToastVisible(true);
    }
  };

  const resetScanner = () => {
    setProduct(null);
    setLastScanned(null);
    setErrorMsg('');
    setIsSaved(false);
    setScanState('scanning');
  };

  // ── Permission denied ──────────────────────────────────────────────────────
  if (permission && !permission.granted) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <MaterialCommunityIcons name="camera-off" size={64} color={colors.textSecondary} />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionSubtitle}>
          Enable camera permission in your device settings to scan barcodes.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Starting camera...</Text>
      </View>
    );
  }

  // ── Macro row helper ───────────────────────────────────────────────────────
  const MacroChip = ({ label, value, unit }: { label: string; value: number; unit: string }) => (
    <View style={styles.macroChip}>
      <Text style={styles.macroValue}>
        {value}
        <Text style={styles.macroUnit}>{unit}</Text>
      </Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );

  const NutrientRow = ({ label, value, unit }: { label: string; value: number; unit: string }) => (
    <View style={styles.nutrientRow}>
      <Text style={styles.nutrientLabel}>{label}</Text>
      <Text style={styles.nutrientValue}>
        {value} {unit}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* ── Camera viewfinder (always rendered in background) ── */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchOn}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
        onBarcodeScanned={scanState === 'scanning' ? onBarcodeScanned : undefined}
      />

      {/* ── Scanning overlay ── */}
      {scanState === 'scanning' && (
        <View style={styles.overlay}>
          {/* Top bar */}
          <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>Scan Barcode</Text>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setTorchOn((t) => !t)}>
              <MaterialCommunityIcons
                name={torchOn ? 'flashlight' : 'flashlight-off'}
                size={24}
                color={torchOn ? colors.accent : '#FFF'}
              />
            </TouchableOpacity>
          </View>

          {/* Reticle */}
          <View style={styles.reticleContainer}>
            <View style={styles.reticle}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <View style={styles.scanLine} />
            </View>
            <Text style={styles.scanHint}>Point at a barcode on packaged food</Text>
          </View>

          {/* Bottom padding */}
          <View style={{ height: insets.bottom + 32 }} />
        </View>
      )}

      {/* ── Loading ── */}
      {scanState === 'loading' && (
        <View style={[styles.overlay, styles.center]}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingTitle}>Looking up product...</Text>
            <Text style={styles.loadingBarcode}>{lastScanned}</Text>
          </View>
        </View>
      )}

      {/* ── Error ── */}
      {scanState === 'error' && (
        <View style={[styles.overlay, styles.center]}>
          <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + Spacing.xl }]}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => navigation.goBack()}
            >
              <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <MaterialCommunityIcons name="barcode-off" size={56} color={colors.error} />
            <Text style={styles.errorTitle}>Not Found</Text>
            <Text style={styles.errorMsg}>{errorMsg}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={resetScanner}>
              <MaterialCommunityIcons name="barcode-scan" size={20} color="#000" />
              <Text style={styles.primaryBtnText}>Scan Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Result sheet ── */}
      {scanState === 'result' && product && (
        <View style={[styles.overlay, styles.sheetBg]}>
          <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Close */}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => navigation.goBack()}
              >
                <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Product image */}
              {product.imageUrl ? (
                <Image
                  source={{ uri: product.imageUrl }}
                  style={styles.productImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.productImagePlaceholder}>
                  <MaterialCommunityIcons name="barcode-scan" size={48} color={colors.textSecondary} />
                </View>
              )}

              {/* Product name + brand */}
              {product.brand ? (
                <Text style={styles.brandText}>{product.brand.toUpperCase()}</Text>
              ) : null}
              <Text style={styles.productName}>{product.productName}</Text>
              <Text style={styles.servingLabel}>Per serving · {product.servingSize}</Text>

              {/* Macro chips */}
              <View style={styles.macroRow}>
                <MacroChip label="Calories" value={product.nutrition.calories} unit=" kcal" />
                <MacroChip label="Protein" value={product.nutrition.protein_g} unit="g" />
                <MacroChip label="Carbs" value={product.nutrition.carbs_g} unit="g" />
                <MacroChip label="Fat" value={product.nutrition.fat_g} unit="g" />
              </View>

              {/* Detailed nutrients */}
              <View style={styles.nutrientsCard}>
                <NutrientRow label="Dietary Fiber" value={product.nutrition.fiber_g} unit="g" />
                <NutrientRow label="Sugars" value={product.nutrition.sugar_g} unit="g" />
                <NutrientRow label="Sodium" value={product.nutrition.sodium_mg} unit="mg" />
              </View>
            </ScrollView>

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={resetScanner}>
                <MaterialCommunityIcons name="barcode-scan" size={18} color={colors.accent} />
                <Text style={styles.secondaryBtnText}>Scan Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, isSaved && styles.primaryBtnSaved]}
                onPress={handleSave}
                disabled={isSaved}
              >
                <MaterialCommunityIcons
                  name={isSaved ? 'check' : 'plus'}
                  size={18}
                  color="#000"
                />
                <Text style={styles.primaryBtnText}>{isSaved ? 'Saved!' : 'Add to Today'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
};

const CORNER = 22;
const BORDER = 3;

type CV = ReturnType<typeof useAppTheme>['colors'];
function createStyles(colors: CV) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  sheetBg: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    color: '#FFF',
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
  },

  reticleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticle: {
    width: 260,
    height: 160,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: colors.accent,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER },
  cornerTR: { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER },
  scanLine: {
    position: 'absolute',
    width: '85%',
    height: 2,
    backgroundColor: colors.accent,
    opacity: 0.7,
  },
  scanHint: {
    marginTop: Spacing.xl,
    color: 'rgba(255,255,255,0.75)',
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
  },

  loadingCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    width: 260,
  },
  loadingTitle: {
    color: colors.text,
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
  },
  loadingBarcode: {
    color: colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    fontFamily: 'monospace',
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.sm,
  },

  bottomSheet: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    maxHeight: '85%',
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  productImage: {
    width: '100%',
    height: 140,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    backgroundColor: colors.surface,
  },
  productImagePlaceholder: {
    width: '100%',
    height: 100,
    borderRadius: BorderRadius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  brandText: {
    color: colors.accent,
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  productName: {
    color: colors.text,
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  servingLabel: {
    color: colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.lg,
  },

  macroRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  macroChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  macroValue: {
    color: colors.text,
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
  },
  macroUnit: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '400',
  },
  macroLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },

  nutrientsCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nutrientLabel: {
    color: colors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
  nutrientValue: {
    color: colors.text,
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
  },

  errorTitle: {
    color: colors.text,
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  errorMsg: {
    color: colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },

  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
  },
  primaryBtnSaved: {
    backgroundColor: colors.success,
  },
  primaryBtnText: {
    color: '#000',
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  secondaryBtnText: {
    color: colors.accent,
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
  },

  permissionTitle: {
    color: colors.text,
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  permissionSubtitle: {
    color: colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  backBtn: {
    backgroundColor: colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  backBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: Typography.fontSize.base,
  },
  });
}

