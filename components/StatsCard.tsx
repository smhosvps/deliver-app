// components/StatsCard.tsx
import React from 'react';
import { View, ViewProps } from 'react-native';

interface StatsCardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export default function StatsCard({ children, className = '', ...props }: StatsCardProps) {
  return (
    <View 
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
      }}
      {...props}
    >
      {children}
    </View>
  );
}