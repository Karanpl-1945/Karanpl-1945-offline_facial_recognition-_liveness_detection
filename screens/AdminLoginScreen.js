import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';

const ADMIN_PIN = '1234';

export default function AdminLoginScreen({ onNavigate }) {
  const [pin, setPin] = useState('');

  const handlePress = (digit) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === 4) {
      setTimeout(() => {
        if (newPin === ADMIN_PIN) {
          setPin('');
          onNavigate('adminDash');
        } else {
          Alert.alert('Wrong PIN', 'Please try again.');
          setPin('');
        }
      }, 200);
    }
  };

  const handleDelete = () => setPin(pin.slice(0, -1));

  const dots = [0, 1, 2, 3].map(i => (
    <View key={i} style={[styles.dot, i < pin.length ? styles.dotFilled : styles.dotEmpty]} />
  ));

  const keys = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['','0','⌫'],
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Login</Text>
      <Text style={styles.subtitle}>Enter your 4-digit PIN</Text>

      <View style={styles.dotsRow}>{dots}</View>

      <View style={styles.pad}>
        {keys.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((k, ki) => (
              <TouchableOpacity
                key={ki}
                style={[styles.key, k === '' && styles.keyEmpty]}
                onPress={() => k === '⌫' ? handleDelete() : k !== '' ? handlePress(k) : null}
                activeOpacity={0.7}
              >
                <Text style={styles.keyText}>{k}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('home')}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title:      { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle:   { fontSize: 14, color: '#666', marginBottom: 40 },
  dotsRow:    { flexDirection: 'row', gap: 16, marginBottom: 48 },
  dot:        { width: 18, height: 18, borderRadius: 9 },
  dotFilled:  { backgroundColor: '#1a73e8' },
  dotEmpty:   { backgroundColor: '#333' },
  pad:        { width: '75%' },
  row:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  key:        { width: 72, height: 72, borderRadius: 36, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2a2a2a' },
  keyEmpty:   { backgroundColor: 'transparent', borderColor: 'transparent' },
  keyText:    { fontSize: 24, color: '#fff', fontWeight: '500' },
  backButton: { marginTop: 32 },
  backText:   { color: '#555', fontSize: 14 },
});
