import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

export interface PointsToastRef {
  show: (points: number, bonus?: number) => void;
}

const PointsToast = forwardRef<PointsToastRef>((_, ref) => {
  const opacity  = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const label    = useRef('+10 pts');
  const [text, setText] = React.useState('+10 pts');

  useImperativeHandle(ref, () => ({
    show(points: number, bonus = 0) {
      const total = points + bonus;
      const parts = [`+${points} pts`];
      if (bonus > 0) parts.push(`+${bonus} streak bonus`);
      setText(parts.join('  ·  '));

      opacity.setValue(0);
      translateY.setValue(0);

      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity,     { toValue: 1,   duration: 200, useNativeDriver: true }),
          Animated.timing(translateY,  { toValue: -24, duration: 300, useNativeDriver: true }),
        ]),
        Animated.delay(1200),
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    },
  }));

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]}>
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
});

export default PointsToast;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  text: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
