import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Innovation Hacks 2026</Text>
      <Text style={styles.subtitle}>
        Your React Native TypeScript project is ready.
      </Text>
      <Text style={styles.caption}>Edit App.tsx to start building.</Text>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#14213d',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#33415c',
    marginBottom: 8,
    textAlign: 'center',
  },
  caption: {
    fontSize: 14,
    color: '#5c677d',
    textAlign: 'center',
  },
});
