import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

const Card = ({
  children,
  style,
  onPress,
  elevation = 2,
  padding = 16,
  borderRadius = 12,
}) => {
  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <CardComponent
      style={[
        styles.card,
        {
          elevation,
          padding,
          borderRadius,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {children}
    </CardComponent>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
});

export default Card;
