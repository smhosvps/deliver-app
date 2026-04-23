import { AntDesign } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import Toast from "react-native-toast-message";
import { useGetUserQuery } from "../../redux/api/apiSlice";
import { useUpdateAvatarMutation } from "../../redux/features/user/userApi";
import { useAppSelector } from "../../redux/store/store";

export default function UpdateProfilePicture() {
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const isDarkMode = useAppSelector((state) => state.theme.isDarkMode);
  const [isUploading, setIsUploading] = useState(false);
  const { width } = useWindowDimensions();

  const [updateAvatar] = useUpdateAvatarMutation();
  const { data: userData, refetch } = useGetUserQuery<any>();

  // Responsive sizing
  const isLargeScreen = width > 768;
  const containerSize = isLargeScreen ? 160 : 80; // 52*4 = 208, 20*4 = 80
  const cameraIconSize = isLargeScreen ? 38 : 20;
  const cameraIconInnerSize = isLargeScreen ? 12 : 9;
  const placeholderImageSize = isLargeScreen ? 140 : 56;

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        selectionLimit: 1,  
        aspect: [4, 3],
        quality: 1,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;
      setIsUploading(true);

      // Compress and resize image
      const manipulatedImage = await manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 500 } }], // Resize to reasonable size
        { compress: 0.6, format: SaveFormat.JPEG }
      );

      // Convert to base64
      const base64 = await FileSystem.readAsStringAsync(manipulatedImage.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const base64String = `data:image/jpeg;base64,${base64}`;

      // Update avatar with base64 string
      await updateAvatar({ avatar: base64String }).unwrap();

      // Update local state
      setBase64Image(base64String);
      await refetch();
      Toast.show({
        type: "success",
        text1: "Profile picture updated successfully",
        text2: "Success",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      Toast.show({
        type: "error",
        text1: `${error.data?.message || "Failed to update profile picture"}`,
        text2: "Error",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View className="items-start justify-center bg">
      <TouchableOpacity
        className="relative mb-4"
        onPress={pickImage}
        activeOpacity={0.8}
        disabled={isUploading}
      >
        {/* Main Image Container */}
        <View className="relative">
          {base64Image || userData?.user?.avatar?.url ? (
            <Image
              source={{ uri: base64Image || userData.user.avatar.url }}
              style={{
                width: containerSize,
                height: containerSize,
              }}
              className="rounded-full border-2 border-gray-300"
            />
          ) : (
            <View
              className={`${
                isDarkMode ? "bg-gray-800" : "bg-gray-100"
              } rounded-full border-2 border-gray-300 items-center justify-center bg-white`}
              style={{
                width: containerSize,
                height: containerSize,
              }}
            >
              <Image
                source={{
                  uri: "https://cdn-icons-png.flaticon.com/512/147/147142.png",
                }}
                style={{
                  width: placeholderImageSize,
                  height: placeholderImageSize,
                }}
                className={`rounded-full ${
                  isDarkMode ? "opacity-80" : "opacity-60"
                }`}
              />
            </View>
          )}

          {/* Camera Icon Overlay */}
          <View
            className={`${
              isDarkMode ? "bg-blue-600" : "bg-blue-500"
            } absolute -right-0 -bottom-1 rounded-full border-2 border-white items-center justify-center shadow-lg`}
            style={{
              width: cameraIconSize,
              height: cameraIconSize,
            }}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <AntDesign
                name="camera"
                size={cameraIconInnerSize}
                color="white"
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
      <Toast />
    </View>
  );
}