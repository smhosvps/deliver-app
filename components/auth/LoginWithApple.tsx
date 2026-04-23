// components/auth/LoginWithApple.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAppleLoginMutation } from '@/redux/api/apiSlice';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { useAuth } from '@/context/auth';

export default function LoginWithApple() {
  const [appleLogin, { isLoading: isSigningIn, data, error }] = useAppleLoginMutation();
  const { setUserCredentials } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [loadingModalVisible, setLoadingModalVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  console.log(data, "error", error);

  useEffect(() => {
    if (isSigningIn) {
      setLoadingModalVisible(true);
    } else {
      const timer = setTimeout(() => {
        setLoadingModalVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isSigningIn]);

  const getErrorMessage = (error: unknown): string => {
    if (error && typeof error === 'object' && 'data' in error) {
      const fetchError = error as FetchBaseQueryError;
      const data = fetchError.data as { message?: string };
      if (data?.message) return data.message;
    }
    if (error instanceof Error) return error.message;
    return "Login failed. Please try again.";
  };

  const handleAppleSignIn = async () => {
    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        setErrorMessage("Apple Sign-In is not available on this device");
        setErrorModalVisible(true);
        return;
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.email) setEmail(credential.email);

      const response = await appleLogin({
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode,
        user: credential.user,
        email: credential.email,
        fullName: credential.fullName,
      }).unwrap();

      setUserCredentials(response);

      // ✅ Conditional navigation based on backend message
      if (response.message === "Please complete your verification details to start delivering.") {
        router.replace("/others/otherInfo-screen");
      } else {
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      console.error("Login failed:", err);

      // Cancelation – no error modal
      if (
        err.code === 'ERR_REQUEST_CANCELED' ||
        (err.message && err.message.toLowerCase().includes('cancel'))
      ) {
        console.log('User canceled Apple Sign-In');
        return;
      }

      // Get detailed error from backend if available
      let detailedError = getErrorMessage(err);

      // Customize generic message for known HTTP statuses
      if (err?.status === 403) {
        if (detailedError.includes('customer')) {
          detailedError = 'This account is a customer account. Please use the customer app.';
        } else if (detailedError.includes('rider')) {
          detailedError = 'This account is already a rider. Please use the rider app.';
        } else {
          detailedError = 'You are not authorized to use this app.';
        }
      }

      // ✅ Primary message: "Sorry, unable to login. Please use another option."
      // Keep the detailed error as secondary (shown below).
      setErrorMessage(detailedError);
      setErrorModalVisible(true);

      // Handle verification flow if needed (but message will still show generic first)
      if (
        detailedError.includes("Account not verified") ||
        detailedError.includes("not verified") ||
        detailedError.includes("verify")
      ) {
        setTimeout(() => {
          router.push({
            pathname: "/auth/verify-otp",
            params: {
              email: email,
              method: "email",
            },
          });
        }, 1500);
      }
    }
  };

  const closeErrorModal = () => {
    setErrorModalVisible(false);
    setErrorMessage('');
  };

  return (
    <View>
      <AppleAuthentication.AppleAuthenticationButton
        onPress={handleAppleSignIn}
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={40}
        style={{ width: "100%", height: 58 }}
      />

      {/* Loading Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={loadingModalVisible}
        onRequestClose={() => {
          if (!isSigningIn) setLoadingModalVisible(false);
        }}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}>
          <View style={{
            backgroundColor: 'white',
            padding: 30,
            borderRadius: 15,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}>
            <ActivityIndicator size="large" color="#000000" />
            <Text style={{ marginTop: 15, fontSize: 16, color: '#333', fontWeight: '500' }}>
              Signing in with Apple...
            </Text>
          </View>
        </View>
      </Modal>

      {/* Error Modal with user-friendly message */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={errorModalVisible}
        onRequestClose={closeErrorModal}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 20,
            width: '80%',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}>
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: '#FEE2E2',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 15,
            }}>
              <Feather name="alert-circle" size={32} color="#DC2626" />
            </View>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#DC2626',
              marginBottom: 8,
              textAlign: 'center',
            }}>
              Sorry, unable to login
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#4B5563',
              textAlign: 'center',
              marginBottom: 20,
              lineHeight: 20,
            }}>
              Please use another option.
              {errorMessage ? `\n\n${errorMessage}` : ''}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#000000',
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 30,
                width: '100%',
              }}
              onPress={closeErrorModal}
            >
              <Text style={{
                color: 'white',
                fontWeight: '600',
                textAlign: 'center',
                fontSize: 16,
              }}>
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}