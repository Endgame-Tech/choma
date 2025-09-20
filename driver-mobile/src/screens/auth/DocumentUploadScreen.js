// src/screens/auth/DocumentUploadScreen.js - Document upload for driver verification
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import { useAlert } from "../../contexts/AlertContext";
import CustomText from "../../components/ui/CustomText";
import driverApiService from "../../services/driverApi";

const DocumentUploadScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { showError, showSuccess } = useAlert();

  const [documents, setDocuments] = useState({
    license: { uri: null, uploaded: false, uploading: false },
    insurance: { uri: null, uploaded: false, uploading: false },
    registration: { uri: null, uploaded: false, uploading: false },
    profilePhoto: { uri: null, uploaded: false, uploading: false },
  });

  const [isCompleting, setIsCompleting] = useState(false);

  const documentTypes = [
    {
      key: "profilePhoto",
      title: "Profile Photo",
      subtitle: "Clear photo of yourself",
      icon: "person-circle",
      required: true,
      type: "image",
    },
    {
      key: "license",
      title: "Driver's License",
      subtitle: "Front and back of your license",
      icon: "card",
      required: true,
      type: "image",
    },
    {
      key: "insurance",
      title: "Vehicle Insurance",
      subtitle: "Valid insurance certificate",
      icon: "shield-checkmark",
      required: true,
      type: "document",
    },
    {
      key: "registration",
      title: "Vehicle Registration",
      subtitle: "Vehicle registration papers",
      icon: "document-text",
      required: true,
      type: "document",
    },
  ];

  // Request camera/gallery permissions
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "We need access to your photos to upload documents.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  };

  // Show image picker options
  const showImagePickerOptions = (documentKey) => {
    Alert.alert(
      "Select Image",
      "Choose how you want to add your document",
      [
        {
          text: "Camera",
          onPress: () => takePhoto(documentKey),
        },
        {
          text: "Photo Library",
          onPress: () => pickImage(documentKey),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  // Take photo with camera
  const takePhoto = async (documentKey) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setDocuments(prev => ({
          ...prev,
          [documentKey]: { ...prev[documentKey], uri: result.assets[0].uri }
        }));
        await uploadDocument(documentKey, result.assets[0]);
      }
    } catch (error) {
      showError("Failed to take photo");
    }
  };

  // Pick image from gallery
  const pickImage = async (documentKey) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setDocuments(prev => ({
          ...prev,
          [documentKey]: { ...prev[documentKey], uri: result.assets[0].uri }
        }));
        await uploadDocument(documentKey, result.assets[0]);
      }
    } catch (error) {
      showError("Failed to pick image");
    }
  };

  // Pick document file
  const pickDocument = async (documentKey) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setDocuments(prev => ({
          ...prev,
          [documentKey]: { ...prev[documentKey], uri: result.assets[0].uri }
        }));
        await uploadDocument(documentKey, result.assets[0]);
      }
    } catch (error) {
      showError("Failed to pick document");
    }
  };

  // Upload document to backend
  const uploadDocument = async (documentKey, asset) => {
    setDocuments(prev => ({
      ...prev,
      [documentKey]: { ...prev[documentKey], uploading: true }
    }));

    try {
      const formData = new FormData();
      formData.append("document", {
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        name: asset.fileName || `${documentKey}.jpg`,
      });
      formData.append("documentType", documentKey);

      await driverApiService.uploadDocument(documentKey, formData);

      setDocuments(prev => ({
        ...prev,
        [documentKey]: { 
          ...prev[documentKey], 
          uploading: false, 
          uploaded: true 
        }
      }));

      showSuccess("Document uploaded successfully");
    } catch (error) {
      setDocuments(prev => ({
        ...prev,
        [documentKey]: { ...prev[documentKey], uploading: false }
      }));
      showError(error.message || "Failed to upload document");
    }
  };

  // Handle document selection
  const handleDocumentSelect = (documentKey, documentType) => {
    if (documentType === "image") {
      showImagePickerOptions(documentKey);
    } else {
      pickDocument(documentKey);
    }
  };

  // Check if all required documents are uploaded
  const areAllDocumentsUploaded = () => {
    return documentTypes
      .filter(doc => doc.required)
      .every(doc => documents[doc.key].uploaded);
  };

  // Complete document verification
  const completeVerification = async () => {
    if (!areAllDocumentsUploaded()) {
      showError("Please upload all required documents");
      return;
    }

    setIsCompleting(true);
    try {
      // Submit for verification
      await driverApiService.request("/documents/submit-verification", {
        method: "POST",
      });

      showSuccess("Documents submitted for verification!");
      navigation.navigate("VerificationPending");
    } catch (error) {
      showError(error.message || "Failed to submit documents");
    } finally {
      setIsCompleting(false);
    }
  };

  // Render document item
  const renderDocumentItem = (docType) => {
    const doc = documents[docType.key];
    
    return (
      <TouchableOpacity
        key={docType.key}
        style={styles(colors).documentItem}
        onPress={() => handleDocumentSelect(docType.key, docType.type)}
        disabled={doc.uploading}
      >
        <View style={styles(colors).documentInfo}>
          <View style={styles(colors).documentIcon}>
            <Ionicons 
              name={docType.icon} 
              size={24} 
              color={doc.uploaded ? colors.success : colors.primary} 
            />
          </View>
          <View style={styles(colors).documentText}>
            <CustomText style={styles(colors).documentTitle}>
              {docType.title}
              {docType.required && <CustomText style={styles(colors).required}> *</CustomText>}
            </CustomText>
            <CustomText style={styles(colors).documentSubtitle}>
              {docType.subtitle}
            </CustomText>
          </View>
        </View>

        <View style={styles(colors).documentStatus}>
          {doc.uploading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : doc.uploaded ? (
            <View style={styles(colors).uploadedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <CustomText style={styles(colors).uploadedText}>Uploaded</CustomText>
            </View>
          ) : (
            <View style={styles(colors).uploadButton}>
              <Ionicons name="cloud-upload" size={16} color={colors.primary} />
              <CustomText style={styles(colors).uploadText}>Upload</CustomText>
            </View>
          )}
        </View>

        {doc.uri && (
          <View style={styles(colors).preview}>
            <Image source={{ uri: doc.uri }} style={styles(colors).previewImage} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles(colors).container}>
      {/* Header */}
      <View style={styles(colors).header}>
        <TouchableOpacity
          style={styles(colors).backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <CustomText style={styles(colors).headerTitle}>Document Upload</CustomText>
        <View style={styles(colors).headerRight} />
      </View>

      {/* Content */}
      <ScrollView style={styles(colors).content} showsVerticalScrollIndicator={false}>
        <View style={styles(colors).intro}>
          <CustomText style={styles(colors).introTitle}>
            Upload Required Documents
          </CustomText>
          <CustomText style={styles(colors).introText}>
            Please upload clear photos of your documents. All documents will be reviewed 
            within 24-48 hours for verification.
          </CustomText>
        </View>

        <View style={styles(colors).documentsContainer}>
          {documentTypes.map(renderDocumentItem)}
        </View>

        <View style={styles(colors).tips}>
          <CustomText style={styles(colors).tipsTitle}>📋 Tips for better photos:</CustomText>
          <CustomText style={styles(colors).tip}>• Ensure good lighting</CustomText>
          <CustomText style={styles(colors).tip}>• Keep documents flat and unfolded</CustomText>
          <CustomText style={styles(colors).tip}>• Make sure all text is clearly readable</CustomText>
          <CustomText style={styles(colors).tip}>• Avoid shadows and reflections</CustomText>
        </View>
      </ScrollView>

      {/* Bottom button */}
      <View style={styles(colors).buttonContainer}>
        <TouchableOpacity
          style={[
            styles(colors).completeButton,
            !areAllDocumentsUploaded() && styles(colors).buttonDisabled
          ]}
          onPress={completeVerification}
          disabled={!areAllDocumentsUploaded() || isCompleting}
        >
          {isCompleting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <CustomText style={styles(colors).buttonText}>
              Complete Verification
            </CustomText>
          )}
        </TouchableOpacity>
        
        <CustomText style={styles(colors).buttonSubtext}>
          {areAllDocumentsUploaded() 
            ? "All documents uploaded. Ready to proceed!" 
            : `${documentTypes.filter(doc => doc.required && documents[doc.key].uploaded).length}/${documentTypes.filter(doc => doc.required).length} required documents uploaded`
          }
        </CustomText>
      </View>
    </SafeAreaView>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    headerRight: {
      width: 40,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    intro: {
      paddingVertical: 20,
    },
    introTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
    },
    introText: {
      fontSize: 16,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    documentsContainer: {
      marginBottom: 24,
    },
    documentItem: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    documentInfo: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    documentIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    documentText: {
      flex: 1,
    },
    documentTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 2,
    },
    required: {
      color: colors.error,
    },
    documentSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    documentStatus: {
      alignItems: "flex-end",
      marginBottom: 8,
    },
    uploadedBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.success + "20",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 16,
    },
    uploadedText: {
      fontSize: 12,
      color: colors.success,
      marginLeft: 4,
      fontWeight: "600",
    },
    uploadButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary + "20",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    uploadText: {
      fontSize: 12,
      color: colors.primary,
      marginLeft: 4,
      fontWeight: "600",
    },
    preview: {
      marginTop: 8,
      alignItems: "center",
    },
    previewImage: {
      width: 80,
      height: 60,
      borderRadius: 6,
      backgroundColor: colors.backgroundSecondary,
    },
    tips: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      padding: 16,
      marginBottom: 100,
    },
    tipsTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    tip: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    buttonContainer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    completeButton: {
      height: 48,
      backgroundColor: colors.primary,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    buttonDisabled: {
      backgroundColor: colors.backgroundSecondary,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.white,
    },
    buttonSubtext: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: "center",
    },
  });

export default DocumentUploadScreen;