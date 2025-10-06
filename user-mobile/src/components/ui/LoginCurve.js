import React from "react";
import { Dimensions, View } from "react-native";
import { Svg, Path } from "react-native-svg";

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
          bottom: -250, 
          left: 0,
          width: curveWidth,
          height: curveHeight,
          zIndex: 3, // Above background, below form
          backgroundColor: "transparent",
        },
        style,
      ]}
    >
      <Svg
        width={curveWidth}
        height={curveHeight}
        preserveAspectRatio="none"
        viewBox="0 0 492.4 646.44"
        style={{
          backgroundColor: "transparent",
        }}
      >
        <Path
          d="M492.26,0V646.44H0V224.2c24.56,20.73,73.76,56.29,144.04,68.73,102.89,18.21,227.41-17.33,296.86-114.99C490.33,108.44,493.25,33.65,492.26,0Z"
          fill="#fff"
        />
      </Svg>
    </View>
  );
};

export default LoginCurve;
