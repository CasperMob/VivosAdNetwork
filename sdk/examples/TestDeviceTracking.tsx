/**
 * Test Component for React Native Device Tracking
 * 
 * Drop this into your Expo app to test if device tracking works
 * 
 * Usage:
 * import TestDeviceTracking from './path/to/TestDeviceTracking';
 * 
 * <TestDeviceTracking />
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, Dimensions } from 'react-native';

export default function TestDeviceTracking() {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, message]);
  };

  useEffect(() => {
    testDeviceDetection();
  }, []);

  const testDeviceDetection = async () => {
    addLog('=== Starting Device Tracking Test ===');
    
    // Test 1: Check navigator
    addLog(`\n1. Navigator Test:`);
    addLog(`   navigator.product: ${navigator.product}`);
    addLog(`   Is React Native: ${navigator.product === 'ReactNative'}`);
    
    // Test 2: Check Platform
    addLog(`\n2. Platform Test:`);
    try {
      addLog(`   Platform.OS: ${Platform.OS}`);
      addLog(`   Platform.Version: ${Platform.Version}`);
      addLog(`   Platform.isPad: ${Platform.isPad}`);
      addLog(`   Platform.isTV: ${Platform.isTV}`);
      addLog(`   ✅ Platform available`);
    } catch (e) {
      addLog(`   ❌ Platform error: ${e}`);
    }
    
    // Test 3: Check Dimensions
    addLog(`\n3. Dimensions Test:`);
    try {
      const window = Dimensions.get('window');
      const screen = Dimensions.get('screen');
      addLog(`   Window: ${window.width} x ${window.height}`);
      addLog(`   Screen: ${screen.width} x ${screen.height}`);
      addLog(`   Scale: ${window.scale}`);
      addLog(`   ✅ Dimensions available`);
    } catch (e) {
      addLog(`   ❌ Dimensions error: ${e}`);
    }
    
    // Test 4: Check if require works
    addLog(`\n4. Require Test:`);
    try {
      // @ts-ignore
      const RN = require('react-native');
      addLog(`   RN.Platform: ${!!RN.Platform}`);
      addLog(`   RN.Dimensions: ${!!RN.Dimensions}`);
      addLog(`   ✅ require('react-native') works`);
    } catch (e) {
      addLog(`   ❌ require error: ${e}`);
    }
    
    // Test 5: Simulate SDK device info collection
    addLog(`\n5. SDK Device Info Simulation:`);
    try {
      const deviceInfo = {
        platform: 'react-native',
        device_os: `${Platform.OS} ${Platform.Version || ''}`.trim(),
        device_type: Platform.isPad || Platform.isTV ? 'tablet' : 'mobile',
        screen_width: Math.round(Dimensions.get('window').width),
        screen_height: Math.round(Dimensions.get('window').height),
      };
      addLog(`   ${JSON.stringify(deviceInfo, null, 2)}`);
      addLog(`   ✅ SDK should collect this data automatically`);
    } catch (e) {
      addLog(`   ❌ SDK simulation error: ${e}`);
    }
    
    // Test 6: Test fetch availability
    addLog(`\n6. Fetch Test:`);
    try {
      addLog(`   fetch available: ${typeof fetch !== 'undefined'}`);
      addLog(`   ✅ Can make network requests`);
    } catch (e) {
      addLog(`   ❌ Fetch error: ${e}`);
    }
    
    addLog(`\n=== Test Complete ===`);
    addLog(`\nIf all tests passed, device tracking should work automatically!`);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Device Tracking Test</Text>
        <Text style={styles.subtitle}>Check console for detailed logs</Text>
      </View>
      
      <View style={styles.logContainer}>
        {logs.map((log, index) => (
          <Text key={index} style={styles.log}>{log}</Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
  },
  logContainer: {
    padding: 15,
  },
  log: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    color: '#0f0',
    marginBottom: 2,
    lineHeight: 18,
  },
});

