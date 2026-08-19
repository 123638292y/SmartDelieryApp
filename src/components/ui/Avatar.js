import React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
} from 'react-native';

const Avatar = ({
  source,
  name,
  size = 'medium',
  style,
}) => {
  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return styles.small;
      case 'large':
        return styles.large;
      case 'xlarge':
        return styles.xlarge;
      default:
        return styles.medium;
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name) => {
    if (!name) return '#007AFF';
    const colors = [
      '#007AFF', '#5856D6', '#FF2D55', '#FF9500',
      '#FFCC00', '#4CD964', '#5AC8FA', '#FF3B30',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (source) {
    return (
      <Image
        source={source}
        style={[styles.avatar, getSizeStyle(), style]}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        styles.avatarDefault,
        getSizeStyle(),
        { backgroundColor: getAvatarColor(name) },
        style,
      ]}
    >
      <Text style={[styles.initials, getSizeStyle()]}>
        {getInitials(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 999,
  },
  avatarDefault: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: '600',
  },
  // Sizes
  small: {
    width: 32,
    height: 32,
    fontSize: 12,
  },
  medium: {
    width: 40,
    height: 40,
    fontSize: 16,
  },
  large: {
    width: 56,
    height: 56,
    fontSize: 20,
  },
  xlarge: {
    width: 80,
    height: 80,
    fontSize: 28,
  },
});

export default Avatar;
