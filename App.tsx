import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Pastikan path ini sesuai dengan lokasi file Anda
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import StorageScreen from './src/screens/StorageScreen';
import CloudScreen from './src/screens/CloudScreen';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Map" 
          component={MapScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="StorageScreen" 
          component={StorageScreen} 
          options={{ headerShown: false }} 
        />
        {/* Halaman CloudScreen didaftarkan di sini */}
        <Stack.Screen 
          name="CloudScreen" 
          component={CloudScreen} 
          options={{ headerShown: false }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;