import React from "react";
import { Dimensions, View } from "react-native";
import LoginCurveSvg from "../../../assets/login-curve.svg";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const LoginCurve = ({ style }) => {
  // Original SVG dimensions: 492.4 x 646.44
  const originalWidth = 492.4;
  const originalHeight = 646.44;
  const aspectRatio = originalHeight / originalWidth; // ≈ 1.31

  // Width is always full screen width
  const curveWidth = screenWidth;

  // Height is proportional to the full screen width
  const curveHeight = curveWidth * aspectRatio;

  return (
    <View
      style={[
        {
          position: "absolute",
          bottom: -250, // Move curve down more
          left: 0,
          width: curveWidth,
          height: curveHeight,
          zIndex: 3, // Above background, below form
          backgroundColor: "transparent",
        },
        style,
      ]}
    >
      <LoginCurveSvg
        width={curveWidth}
        height={curveHeight}
        preserveAspectRatio="none"
        viewBox="0 0 492.4 646.44"
        style={{
          backgroundColor: "transparent",
        }}
      />
    </View>
  );
};

export default LoginCurve;
