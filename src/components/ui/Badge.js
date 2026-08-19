import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Badge = ({
  text,
  variant = 'primary',
  size = 'medium',
  style,
  textStyle,
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primary;
      case 'success':
        return styles.success;
      case 'warning':
        return styles.warning;
      case 'danger':
        return styles.danger;
      case 'info':
        return styles.info;
      case 'outline':
        return styles.outline;
      default:
        return styles.primary;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return styles.small;
      case 'large':
        return styles.large;
      default:
        return styles.medium;
    }
  };

  const getTextVariantStyle = () => {
    switch (variant) {
      case 'outline':
        return styles.textOutline;
      default:
        return styles.textDefault;
    }
  };

  return (
    <View
      style={[
        styles.badge,
        getVariantStyle(),
        getSizeStyle(),
        style,
      ]}
    >
      <Text style={[styles.text, getTextVariantStyle(), textStyle]}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: {
    fontWeight: '600',
    fontSize: 12,
  },
  // Variants
  primary: {
    backgroundColor: '#007AFF',
  },
  success: {
    backgroundColor: '#34C759',
  },
  warning: {
    backgroundColor: '#FF9500',
  },
  danger: {
    backgroundColor: '#FF3B30',
  },
  info: {
    backgroundColor: '#5856D6',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  // Text variants
  textDefault: {
    color: '#fff',
  },
  textOutline: {
    color: '#007AFF',
  },
  // Sizes
  small: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    minHeight: 20,
  },
  medium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 24,
  },
  large: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 28,
  },
});

export default Badge;
