import React from "react";
import { View, ViewStyle, StyleSheet, Modal, TouchableOpacity, TextStyle, Animated, KeyboardAvoidingView, Platform, BackHandler } from "react-native";
import { BoldText, BoldButton } from "./index";
import { useBoldColors } from "@/constants/themes";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export type BoldModalSize = "sm" | "md" | "lg" | "xl" | "full";
export type BoldModalPosition = "center" | "bottom";

interface BoldModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: BoldModalSize;
  position?: BoldModalPosition;
  closeOnOverlayPress?: boolean;
  showCloseButton?: boolean;
  hideHeader?: boolean;
}

const SIZE_WIDTH: Record<BoldModalSize, string | number> = {
  sm: "85%",
  md: "90%",
  lg: "95%",
  xl: "100%",
  full: "100%",
};

export function BoldModal({
  visible,
  onClose,
  title,
  children,
  size = "md",
  position = "center",
  closeOnOverlayPress = true,
  showCloseButton = true,
  hideHeader = false,
}: BoldModalProps) {
  const colors = useBoldColors();
  const reducedMotion = useReducedMotion();
  const [anim] = React.useState(() => new Animated.Value(0));
  const [mounted, setMounted] = React.useState(visible);

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(anim, {
        toValue: 1,
        duration: reducedMotion ? 0 : 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: reducedMotion ? 0 : 150,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, anim, reducedMotion]);

  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (visible) {
        onClose();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [visible, onClose]);

  const overlayOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [position === "bottom" ? 400 : 50, 0],
  });

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });

  if (!mounted) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={closeOnOverlayPress ? onClose : undefined}
        accessibilityLabel="Close modal"
      >
        <Animated.View
          style={[
            styles.overlay,
            { opacity: overlayOpacity },
          ] as ViewStyle[]}
        />
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.modalWrapper,
          {
            transform: [
              { translateY },
              { scale },
            ],
          },
        ] as ViewStyle[]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoiding}
        >
          <View
            style={[
              styles.modal,
              {
                width: SIZE_WIDTH[size],
                maxHeight: "90%",
                backgroundColor: colors.card,
                borderRadius: position === "bottom" ? 24 : 20,
              },
            ] as ViewStyle[]}
          >
            {!hideHeader && (title || showCloseButton) && (
              <View style={styles.header}>
                {title && (
                  <BoldText variant="heading3" style={styles.title}>
                    {title}
                  </BoldText>
                )}
                {showCloseButton && (
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Close"
                  >
                    <BoldText variant="heading2" style={{ color: colors.mutedForeground }}>
                      ×
                    </BoldText>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <View style={styles.content}>{children}</View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  modalWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  keyboardAvoiding: {
    width: "100%",
  },
  modal: {
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    flex: 1,
    textAlign: "center",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: "80%",
  },
});