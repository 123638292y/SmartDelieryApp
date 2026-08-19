import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';

const ListItem = ({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onPress,
  onRightIconPress,
  style,
  titleStyle,
  subtitleStyle,
  avatar,
}) => {
  const Content = onPress ? TouchableOpacity : View;

  return (
    <Content
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {(leftIcon || avatar) && (
        <View style={styles.leftContainer}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.iconContainer}>{leftIcon}</View>
          )}
        </View>
      )}
      <View style={[styles.textContainer, !leftIcon && !avatar && styles.textContainerFull]}>
        <Text style={[styles.title, titleStyle]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, subtitleStyle]} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightIcon && (
        <TouchableOpacity
          onPress={onRightIconPress}
          style={styles.rightContainer}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.iconContainer}>{rightIcon}</View>
        </TouchableOpacity>
      )}
    </Content>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  leftContainer: {
    marginRight: 12,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  textContainerFull: {
    marginLeft: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  rightContainer: {
    marginLeft: 12,
  },
});

export default ListItem;
