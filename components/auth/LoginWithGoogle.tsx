import { Text, TouchableOpacity, ActivityIndicator, Modal, View } from 'react-native';
import {
    GoogleSignin,
    isErrorWithCode,
    isSuccessResponse,
    statusCodes,
} from "@react-native-google-signin/google-signin";
import { useGoogleSignInMutation } from '@/redux/api/apiSlice';
import { useAuth } from '@/context/auth';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import Svg, { Path } from 'react-native-svg';

GoogleSignin.configure({
    webClientId: "723785150509-8h2v3qin0deo3jrknm9mn2pf09ju7r95.apps.googleusercontent.com",
    iosClientId: "723785150509-ag0k4lgls2qaq78enj48brdepmlgq2mj.apps.googleusercontent.com",
    offlineAccess: false,
});

export default function LoginWithGoogle() {
    const { setUserCredentials } = useAuth();
    const [googleSignIn, { isLoading: isSigningIn }] = useGoogleSignInMutation();
    const [loadingModalVisible, setLoadingModalVisible] = useState(false);
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

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

    const signIn = async () => {
        try {
            await GoogleSignin.hasPlayServices();
            const response = await GoogleSignin.signIn();

            if (isSuccessResponse(response)) {
                const { idToken } = response.data;
                const result = await googleSignIn({ idToken }).unwrap();
                setUserCredentials(result);

                // ✅ Conditional navigation based on backend message
                if (result.message === "Please complete your verification details to start delivering.") {
                    router.replace("/others/otherInfo-screen");
                } else {
                    router.replace("/(tabs)");
                }
            } else {
                console.log("Sign in cancelled");
            }
        } catch (error: any) {
            console.log("FULL GOOGLE ERROR:", JSON.stringify(error, null, 2));

            if (error?.status === 403 && error?.data?.message) {
                setErrorMessage(error.data.message);
                setErrorModalVisible(true);
            } else if (isErrorWithCode(error)) {
                let friendlyMessage = "Sign in failed. Please try again.";
                switch (error.code) {
                    case statusCodes.IN_PROGRESS:
                        friendlyMessage = "Sign in already in progress";
                        break;
                    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
                        friendlyMessage = "Google Play services are not available";
                        break;
                    default:
                        friendlyMessage = error.message || "Sign in failed";
                }
                setErrorMessage(friendlyMessage);
                setErrorModalVisible(true);
            } else {
                setErrorMessage(error?.data?.message || "An unexpected error occurred");
                setErrorModalVisible(true);
            }
        }
    };

    const closeErrorModal = () => {
        setErrorModalVisible(false);
        setErrorMessage('');
    };

    return (
        <>
            <TouchableOpacity
                style={{
                    backgroundColor: "#FFFFFF",
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 16,
                    borderRadius: 30,
                    borderWidth: 1,
                    borderColor: "#DDDDDD",
                    opacity: isSigningIn ? 0.7 : 1,
                }}
                onPress={signIn}
                disabled={isSigningIn}
            >
                {isSigningIn ? (
                    <ActivityIndicator size="small" color="#4285F4" />
                ) : (
                    <>
                        <Svg width={24} height={24} viewBox="0 0 24 24">
                            <Path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <Path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <Path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <Path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </Svg>
                        <Text
                            style={{
                                textAlign: "center",
                                fontWeight: "500",
                                fontSize: 18,
                                color: "#000000",
                            }}
                        >
                            Continue with Google
                        </Text>
                    </>
                )}
            </TouchableOpacity>

            {/* Loading Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={loadingModalVisible}
                onRequestClose={() => {
                    if (!isSigningIn) {
                        setLoadingModalVisible(false);
                    }
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
                        <ActivityIndicator size="large" color="#4285F4" />
                        <Text style={{
                            marginTop: 15,
                            fontSize: 16,
                            color: '#333',
                            fontWeight: '500',
                        }}>
                            Signing in with Google...
                        </Text>
                    </View>
                </View>
            </Modal>

            {/* Error Modal */}
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
                            <Text style={{ fontSize: 30 }}>⚠️</Text>
                        </View>
                        <Text style={{
                            fontSize: 18,
                            fontWeight: 'bold',
                            color: '#DC2626',
                            marginBottom: 10,
                            textAlign: 'center',
                        }}>
                            Sign In Failed
                        </Text>
                        <Text style={{
                            fontSize: 14,
                            color: '#4B5563',
                            textAlign: 'center',
                            marginBottom: 20,
                            lineHeight: 20,
                        }}>
                            {errorMessage}
                        </Text>
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#4285F4',
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
        </>
    );
}