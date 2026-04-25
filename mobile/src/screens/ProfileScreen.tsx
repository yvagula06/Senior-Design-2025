import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, Modal,
  TouchableOpacity, TextInput, Image, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SettingsItem, SectionHeader, InfoCard } from '../components/Profile';
import { Spacing, Typography, BorderRadius } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadSettings, saveSettings } from '../services/storage';
import { useFoodContext } from '../context/FoodContext';
import { useAppTheme, ACCENT_OPTIONS, AccentName } from '../context/ThemeContext';

type DefaultStyle = 'home' | 'restaurant' | 'ask';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
type Sex = 'male' | 'female';

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (desk job)',
  light: 'Light (1-3x/week)',
  moderate: 'Moderate (3-5x/week)',
  active: 'Active (6-7x/week)',
  very_active: 'Very Active (athlete)',
};
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

function calcBMR(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  if (sex === 'male') return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

export const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { calorieGoal, setCalorieGoal, macroGoals, setMacroGoals, clearAllData } = useFoodContext();
  const { colors, isDark, accentName, displayName, profilePicUri, toggleDark, setAccentName, setDisplayName, setProfilePicUri } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [useMetric, setUseMetric] = useState(false);
  const [defaultStyle, setDefaultStyle] = useState<DefaultStyle>('ask');

  const [styleModalVisible, setStyleModalVisible] = useState(false);
  const [calorieModalVisible, setCalorieModalVisible] = useState(false);
  const [macroModalVisible, setMacroModalVisible] = useState(false);
  const [bmrModalVisible, setBmrModalVisible] = useState(false);
  const [nameModalVisible, setNameModalVisible] = useState(false);

  const [calorieInput, setCalorieInput] = useState('');
  const [proteinInput, setProteinInput] = useState('');
  const [carbsInput, setCarbsInput] = useState('');
  const [fatInput, setFatInput] = useState('');
  const [nameInput, setNameInput] = useState('');

  const [bmrWeight, setBmrWeight] = useState('');
  const [bmrHeight, setBmrHeight] = useState('');
  const [bmrAge, setBmrAge] = useState('');
  const [bmrSex, setBmrSex] = useState<Sex>('male');
  const [bmrActivity, setBmrActivity] = useState<ActivityLevel>('moderate');
  const [bmrResult, setBmrResult] = useState<{ bmr: number; tdee: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await loadSettings();
        setUseMetric(s.useMetric);
        setDefaultStyle(s.defaultPrepStyle);
        if (s.weightKg) setBmrWeight(s.weightKg.toString());
        if (s.heightCm) setBmrHeight(s.heightCm.toString());
        if (s.ageYears) setBmrAge(s.ageYears.toString());
        if (s.sex) setBmrSex(s.sex as Sex);
        if (s.activityLevel) setBmrActivity(s.activityLevel as ActivityLevel);
      } catch {}
    })();
  }, []);

  const handleCalorieGoalSave = () => {
    const parsed = parseInt(calorieInput, 10);
    if (!isNaN(parsed) && parsed >= 500 && parsed <= 10000) {
      setCalorieGoal(parsed);
      setCalorieModalVisible(false);
    } else {
      Alert.alert('Invalid Value', 'Please enter a calorie goal between 500 and 10,000.');
    }
  };

  const handleMacroGoalSave = () => {
    const p = parseInt(proteinInput, 10);
    const c = parseInt(carbsInput, 10);
    const f = parseInt(fatInput, 10);
    if ([p, c, f].some(isNaN) || p < 0 || c < 0 || f < 0) {
      Alert.alert('Invalid Values', 'Please enter valid macro goals (0+).');
      return;
    }
    setMacroGoals({ protein: p, carbs: c, fat: f });
    setMacroModalVisible(false);
  };

  const handleBmrCalculate = () => {
    const w = parseFloat(bmrWeight);
    const h = parseFloat(bmrHeight);
    const a = parseInt(bmrAge, 10);
    if (isNaN(w) || isNaN(h) || isNaN(a) || w <= 0 || h <= 0 || a <= 0) {
      Alert.alert('Missing Info', 'Please fill in weight, height, and age.');
      return;
    }
    const bmr = calcBMR(w, h, a, bmrSex);
    const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[bmrActivity]);
    setBmrResult({ bmr: Math.round(bmr), tdee });
    saveSettings({ weightKg: w, heightCm: h, ageYears: a, sex: bmrSex, activityLevel: bmrActivity });
  };

  const handleApplyTdee = () => {
    if (bmrResult) {
      setCalorieGoal(bmrResult.tdee);
      setBmrModalVisible(false);
      setBmrResult(null);
      Alert.alert('Goal Updated', `Your daily calorie goal has been set to ${bmrResult.tdee} kcal.`);
    }
  };

  // ── Appearance handlers ───────────────────────────────────────────────────
  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo library access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setProfilePicUri(result.assets[0].uri);
    }
  };

  const handleRemoveAvatar = () => {
    Alert.alert('Remove Photo', 'Remove your profile picture?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setProfilePicUri(null) },
    ]);
  };

  const handleNameSave = () => {
    setDisplayName(nameInput.trim());
    setNameModalVisible(false);
  };

  const handleStyleSelect = async (style: DefaultStyle) => {
    setDefaultStyle(style);
    setStyleModalVisible(false);
    await saveSettings({ defaultPrepStyle: style });
  };

  const getStyleLabel = () => {
    if (defaultStyle === 'home') return 'Home Cooked';
    if (defaultStyle === 'restaurant') return 'Restaurant';
    return 'Ask Every Time';
  };

  const handleUnitToggle = async (value: boolean) => {
    setUseMetric(value);
    await saveSettings({ useMetric: value });
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all saved food entries, history, and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await AsyncStorage.clear();
            Alert.alert('Done', 'All local data has been cleared.');
          },
        },
      ]
    );
  };

  const handleAboutPress = () => {
    Alert.alert(
      'About NutriLabelAI',
      'NutriLabelAI is an intelligent nutrition analysis app.\n\nVersion 1.0.0\n\nDeveloped by:\nRaj, Rached, Nhat, Matthew\n\nSenior Design Team 2025/2026',
      [{ text: 'OK' }]
    );
  };

  const greeting = displayName ? displayName : 'User Profile';

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xxxl }}>
        {/* ── Header / Avatar ─────────────────────────────────────────── */}
        <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
          <TouchableOpacity onPress={handlePickAvatar} onLongPress={profilePicUri ? handleRemoveAvatar : undefined}>
            {profilePicUri ? (
              <View style={styles.avatarWrapper}>
                <Image source={{ uri: profilePicUri }} style={styles.avatar} />
                <View style={styles.avatarEditBadge}>
                  <MaterialCommunityIcons name="camera" size={14} color="#fff" />
                </View>
              </View>
            ) : (
              <View style={styles.avatarWrapper}>
                <View style={styles.avatarPlaceholder}>
                  <MaterialCommunityIcons name="account" size={48} color={colors.accent} />
                </View>
                <View style={styles.avatarEditBadge}>
                  <MaterialCommunityIcons name="camera" size={14} color="#fff" />
                </View>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setNameInput(displayName); setNameModalVisible(true); }}>
            <Text style={styles.userName}>{greeting}</Text>
            {displayName ? <Text style={styles.userEditHint}>Tap to edit name</Text> : null}
          </TouchableOpacity>
          <Text style={styles.userSubtitle}>
            {displayName ? 'Manage your preferences' : 'Tap name to set it · Tap avatar to change photo'}
          </Text>
        </View>

        {/* ── Appearance ──────────────────────────────────────────────── */}
        <SectionHeader title="Appearance" />
        <View style={styles.settingsGroup}>
          <View style={styles.appearanceRow}>
            <MaterialCommunityIcons
              name={isDark ? 'weather-night' : 'weather-sunny'}
              size={22} color={colors.accent} style={styles.rowIcon}
            />
            <Text style={styles.rowLabel}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
            <Switch
              value={isDark}
              onValueChange={toggleDark}
              trackColor={{ false: colors.border, true: colors.accent + '66' }}
              thumbColor={isDark ? colors.accent : colors.textTertiary}
            />
          </View>
          <View style={styles.accentRow}>
            <MaterialCommunityIcons name="palette" size={22} color={colors.accent} style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Accent Color</Text>
            <View style={styles.swatchGroup}>
              {ACCENT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.name}
                  onPress={() => setAccentName(opt.name as AccentName)}
                  style={[
                    styles.swatch,
                    { backgroundColor: opt.hex },
                    accentName === opt.name && styles.swatchActive,
                  ]}
                >
                  {accentName === opt.name && (
                    <MaterialCommunityIcons name="check" size={12} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
        {/* ── Daily Goals ─────────────────────────────────────────────── */}
        <SectionHeader title="Daily Goals" />
        <View style={styles.settingsGroup}>
          <SettingsItem icon="fire" label="Calorie Goal" type="select" value={`${calorieGoal} kcal`}
            onPress={() => { setCalorieInput(calorieGoal.toString()); setCalorieModalVisible(true); }} />
          <SettingsItem icon="arm-flex" label="Macro Goals" type="select"
            value={`P ${macroGoals.protein}g · C ${macroGoals.carbs}g · F ${macroGoals.fat}g`}
            onPress={() => {
              setProteinInput(macroGoals.protein.toString());
              setCarbsInput(macroGoals.carbs.toString());
              setFatInput(macroGoals.fat.toString());
              setMacroModalVisible(true);
            }} />
          <SettingsItem icon="calculator" label="BMR / TDEE Calculator" type="select" value="Estimate calories"
            onPress={() => setBmrModalVisible(true)} />
        </View>

        <SectionHeader title="Preferences" />
        <View style={styles.settingsGroup}>
          <SettingsItem icon="ruler" label="Units" type="toggle" value={useMetric} onToggle={handleUnitToggle} />
          <SettingsItem icon="chef-hat" label="Default Meal Style" type="select" value={getStyleLabel()}
            onPress={() => setStyleModalVisible(true)} />
        </View>

        <SectionHeader title="About" />
        <View style={styles.settingsGroup}>
          <SettingsItem icon="information" label="About NutriLabelAI" type="info" onPress={handleAboutPress} />
        </View>

        {__DEV__ && (
          <>
            <SectionHeader title="Testing" />
            <View style={styles.settingsGroup}>
              <SettingsItem
                icon="trash-can-outline"
                label="Clear All Local Data"
                type="info"
                onPress={handleClearData}
              />
            </View>
          </>
        )}

        <View style={{ height: Spacing.xl }} />
        <InfoCard icon="database" title="Smart Recipe Database"
          description="We use PostgreSQL with pgvector to search thousands of recipes using semantic embeddings." />
        <InfoCard icon="brain" title="AI-Powered Analysis"
          description="Our ML model analyzes dish descriptions and uses vector similarity search for accurate nutrition estimation." />
        <InfoCard icon="chart-box" title="Confidence Scoring"
          description="Every nutrition estimate comes with a confidence score based on recipe similarity." />

        <View style={styles.footer}>
          <Text style={styles.footerText}>NutriLabelAI v1.0.0</Text>
          <Text style={styles.footerSubtext}>Senior Design Project 2025</Text>
        </View>
      </ScrollView>

      {/* Name Modal */}
      <Modal visible={nameModalVisible} transparent animationType="fade" onRequestClose={() => setNameModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.centeredModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Display Name</Text>
              <TouchableOpacity onPress={() => setNameModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <MaterialCommunityIcons name="account-edit" size={36} color={colors.accent} style={{ marginBottom: Spacing.md }} />
              <TextInput
                style={[styles.bigInput, { fontSize: 20 }]}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Your name"
                placeholderTextColor={colors.textTertiary}
                maxLength={30}
                autoFocus
              />
              <TouchableOpacity style={[styles.saveBtn, { marginTop: Spacing.lg }]} onPress={handleNameSave}>
                <Text style={styles.saveBtnText}>Save Name</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calorie Goal Modal */}
      <Modal visible={calorieModalVisible} transparent animationType="fade" onRequestClose={() => setCalorieModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.centeredModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Daily Calorie Goal</Text>
              <TouchableOpacity onPress={() => setCalorieModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <MaterialCommunityIcons name="fire" size={36} color={colors.accent} style={{ marginBottom: Spacing.md }} />
              <View style={styles.inputRow}>
                <TextInput style={styles.bigInput} value={calorieInput} onChangeText={setCalorieInput}
                  keyboardType="numeric" placeholder="2000" placeholderTextColor={colors.textTertiary}
                  maxLength={5} selectTextOnFocus />
                <Text style={styles.inputUnit}>kcal</Text>
              </View>
              <View style={styles.presetRow}>
                {[1500, 1800, 2000, 2500].map((p) => (
                  <TouchableOpacity key={p} style={[styles.chip, calorieInput === p.toString() && styles.chipActive]}
                    onPress={() => setCalorieInput(p.toString())}>
                    <Text style={[styles.chipText, calorieInput === p.toString() && styles.chipTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCalorieGoalSave}>
                <Text style={styles.saveBtnText}>Save Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Macro Goals Modal */}
      <Modal visible={macroModalVisible} transparent animationType="fade" onRequestClose={() => setMacroModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.centeredModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Daily Macro Goals</Text>
              <TouchableOpacity onPress={() => setMacroModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {[
                { label: 'Protein', color: '#3B82F6', value: proteinInput, setter: setProteinInput },
                { label: 'Carbs', color: '#F59E0B', value: carbsInput, setter: setCarbsInput },
                { label: 'Fat', color: '#EF4444', value: fatInput, setter: setFatInput },
              ].map(({ label, color, value, setter }) => (
                <View key={label} style={styles.macroInputRow}>
                  <View style={[styles.macroDot, { backgroundColor: color }]} />
                  <Text style={styles.macroInputLabel}>{label}</Text>
                  <TextInput style={styles.macroInput} value={value} onChangeText={setter}
                    keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textTertiary}
                    maxLength={4} selectTextOnFocus />
                  <Text style={styles.macroUnit}>g</Text>
                </View>
              ))}
              <TouchableOpacity style={[styles.saveBtn, { marginTop: Spacing.md }]} onPress={handleMacroGoalSave}>
                <Text style={styles.saveBtnText}>Save Goals</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* BMR Modal */}
      <Modal visible={bmrModalVisible} transparent animationType="slide"
        onRequestClose={() => { setBmrModalVisible(false); setBmrResult(null); }}>
        <View style={styles.bottomOverlay}>
          <View style={styles.sheetModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>BMR / TDEE Calculator</Text>
              <TouchableOpacity onPress={() => { setBmrModalVisible(false); setBmrResult(null); }}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: Spacing.lg }} showsVerticalScrollIndicator={false}>
              <Text style={styles.bmrLabel}>Sex</Text>
              <View style={styles.sexRow}>
                {(['male', 'female'] as Sex[]).map((s) => (
                  <TouchableOpacity key={s} style={[styles.sexBtn, bmrSex === s && styles.sexBtnActive]} onPress={() => setBmrSex(s)}>
                    <Text style={[styles.sexBtnText, bmrSex === s && styles.sexBtnTextActive]}>
                      {s === 'male' ? 'Male' : 'Female'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {[
                { label: 'Weight (kg)', val: bmrWeight, set: setBmrWeight, ph: '70' },
                { label: 'Height (cm)', val: bmrHeight, set: setBmrHeight, ph: '170' },
                { label: 'Age (years)', val: bmrAge, set: setBmrAge, ph: '25' },
              ].map(({ label, val, set, ph }) => (
                <View key={label} style={{ marginBottom: Spacing.md }}>
                  <Text style={styles.bmrLabel}>{label}</Text>
                  <TextInput style={styles.bmrInput} value={val} onChangeText={set}
                    keyboardType="numeric" placeholder={ph} placeholderTextColor={colors.textTertiary}
                    maxLength={5} selectTextOnFocus />
                </View>
              ))}
              <Text style={styles.bmrLabel}>Activity Level</Text>
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((lvl) => (
                <TouchableOpacity key={lvl}
                  style={[styles.activityRow, bmrActivity === lvl && styles.activityRowActive]}
                  onPress={() => setBmrActivity(lvl)}>
                  <Text style={[styles.activityText, bmrActivity === lvl && styles.activityTextActive]}>
                    {ACTIVITY_LABELS[lvl]}
                  </Text>
                  {bmrActivity === lvl && <MaterialCommunityIcons name="check-circle" size={18} color={colors.accent} />}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.saveBtn, { marginTop: Spacing.lg, marginBottom: Spacing.md }]} onPress={handleBmrCalculate}>
                <Text style={styles.saveBtnText}>Calculate</Text>
              </TouchableOpacity>
              {bmrResult && (
                <View style={styles.bmrResult}>
                  <View style={styles.bmrResultRow}>
                    <Text style={styles.bmrResultLabel}>BMR (base metabolic rate)</Text>
                    <Text style={styles.bmrResultValue}>{bmrResult.bmr} kcal</Text>
                  </View>
                  <View style={[styles.bmrResultRow, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: Spacing.sm, paddingTop: Spacing.sm }]}>
                    <Text style={[styles.bmrResultLabel, { color: colors.accent, fontWeight: '700' }]}>TDEE (with activity)</Text>
                    <Text style={[styles.bmrResultValue, { color: colors.accent, fontSize: 20 }]}>{bmrResult.tdee} kcal</Text>
                  </View>
                  <TouchableOpacity style={[styles.saveBtn, { marginTop: Spacing.md, backgroundColor: colors.success }]} onPress={handleApplyTdee}>
                    <Text style={styles.saveBtnText}>Apply as Calorie Goal</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Style Modal */}
      <Modal visible={styleModalVisible} transparent animationType="slide" onRequestClose={() => setStyleModalVisible(false)}>
        <View style={styles.bottomOverlay}>
          <View style={styles.sheetModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Default Meal Style</Text>
              <TouchableOpacity onPress={() => setStyleModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {([
              { key: 'home' as DefaultStyle, icon: 'home', label: 'Home Cooked', desc: 'Analyze dishes as homemade meals' },
              { key: 'restaurant' as DefaultStyle, icon: 'silverware-fork-knife', label: 'Restaurant', desc: 'Analyze dishes as restaurant meals' },
              { key: 'ask' as DefaultStyle, icon: 'help-circle', label: 'Ask Every Time', desc: 'Choose style for each analysis' },
            ]).map(({ key, icon, label, desc }) => (
              <TouchableOpacity key={key} style={[styles.styleOption, defaultStyle === key && styles.styleOptionActive]}
                onPress={() => handleStyleSelect(key)}>
                <MaterialCommunityIcons name={icon as any} size={24}
                  color={defaultStyle === key ? colors.accent : colors.textSecondary} />
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <Text style={[styles.styleOptionTitle, defaultStyle === key && { color: colors.accent }]}>{label}</Text>
                  <Text style={styles.styleOptionDesc}>{desc}</Text>
                </View>
                {defaultStyle === key && <MaterialCommunityIcons name="check-circle" size={22} color={colors.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

type C = ReturnType<typeof import('../context/ThemeContext').useAppTheme>['colors'];

function createStyles(colors: C) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      alignItems: 'center',
      paddingBottom: Spacing.lg,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatarWrapper: { marginBottom: Spacing.sm, position: 'relative' },
    avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: colors.accent },
    avatarPlaceholder: {
      width: 88, height: 88, borderRadius: 44,
      backgroundColor: colors.surface,
      borderWidth: 2, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarEditBadge: {
      position: 'absolute', bottom: 2, right: 2,
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: colors.cardBackground,
    },
    userName: {
      fontFamily: 'CrimsonPro_700Bold',
      fontSize: Typography.fontSize.xxl,
      color: colors.text,
      marginTop: 4,
      textAlign: 'center',
    },
    userEditHint: { fontSize: 11, color: colors.textTertiary, marginTop: 2, textAlign: 'center' },
    userSubtitle: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, marginTop: 2, textAlign: 'center', paddingHorizontal: Spacing.xl },
    settingsGroup: {
      backgroundColor: colors.cardBackground,
      borderRadius: BorderRadius.lg,
      marginHorizontal: Spacing.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    appearanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    accentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
    },
    rowIcon: { marginRight: Spacing.md },
    rowLabel: { flex: 1, fontSize: Typography.fontSize.base, fontWeight: '500', color: colors.text },
    swatchGroup: { flexDirection: 'row', gap: 8 },
    swatch: {
      width: 26, height: 26, borderRadius: 13,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: 'transparent',
    },
    swatchActive: { borderColor: colors.text },
    footer: { alignItems: 'center', paddingVertical: Spacing.xl },
    footerText: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, marginBottom: Spacing.xs },
    footerSubtext: { fontSize: 12, color: colors.textTertiary },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center' },
    bottomOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    centeredModal: {
      backgroundColor: colors.cardBackground,
      borderRadius: BorderRadius.xl,
      marginHorizontal: Spacing.lg,
      overflow: 'hidden',
    },
    sheetModal: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: BorderRadius.xl,
      borderTopRightRadius: BorderRadius.xl,
      maxHeight: '92%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: colors.text },
    modalBody: { padding: Spacing.xl, alignItems: 'center' },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
    bigInput: {
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: colors.accent,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      minWidth: 120,
    },
    inputUnit: { fontSize: Typography.fontSize.xl, fontWeight: '600', color: colors.textSecondary },
    presetRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
    chip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    chipText: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: colors.textSecondary },
    chipTextActive: { color: '#FFFFFF' },
    saveBtn: {
      backgroundColor: colors.accent,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xxl,
      alignSelf: 'stretch',
      alignItems: 'center',
    },
    saveBtnText: { fontSize: Typography.fontSize.md, fontWeight: '700', color: '#FFFFFF' },
    macroInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
      alignSelf: 'stretch',
    },
    macroDot: { width: 12, height: 12, borderRadius: 6 },
    macroInputLabel: { flex: 1, fontSize: Typography.fontSize.md, color: colors.text, fontWeight: '600' },
    macroInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      fontSize: Typography.fontSize.lg,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      width: 80,
    },
    macroUnit: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, width: 16 },
    bmrLabel: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, marginBottom: Spacing.xs, fontWeight: '600' },
    bmrInput: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: 10,
      fontSize: Typography.fontSize.lg,
      color: colors.text,
    },
    sexRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
    sexBtn: {
      flex: 1,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    sexBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    sexBtnText: { fontSize: Typography.fontSize.md, fontWeight: '600', color: colors.textSecondary },
    sexBtnTextActive: { color: '#FFFFFF' },
    activityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      marginBottom: 6,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    activityRowActive: { borderColor: colors.accent, backgroundColor: colors.background },
    activityText: { fontSize: Typography.fontSize.sm, color: colors.textSecondary },
    activityTextActive: { color: colors.accent, fontWeight: '600' },
    bmrResult: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bmrResultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    bmrResultLabel: { fontSize: Typography.fontSize.sm, color: colors.textSecondary },
    bmrResultValue: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: colors.text },
    styleOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    styleOptionActive: { backgroundColor: colors.background },
    styleOptionTitle: { fontSize: Typography.fontSize.md, fontWeight: '600', color: colors.text, marginBottom: 2 },
    styleOptionDesc: { fontSize: Typography.fontSize.sm, color: colors.textSecondary },
  });
}
