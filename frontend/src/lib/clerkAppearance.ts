/** Clerk theme aligned with MealMap diner tokens (see styles/global.css). */
import {
  FONT_DISPLAY_FACE,
  FONT_MONO_FACE,
  FONT_SANS_FACE,
} from "../styles/fonts.js";

export const clerkAppearance = {
  variables: {
    colorPrimary: "#E5431E",
    colorDanger: "#C0341D",
    colorSuccess: "#3C7A45",
    colorWarning: "#B7791F",
    colorBackground: "#FBF7EE",
    colorInputBackground: "#FBF7EE",
    colorInputText: "#1B1712",
    colorText: "#1B1712",
    colorTextSecondary: "#8A7D6C",
    colorNeutral: "#1B1712",
    borderRadius: "8px",
    fontFamily: FONT_SANS_FACE,
    fontFamilyButtons: FONT_SANS_FACE,
  },
  elements: {
    rootBox: {
      fontFamily: FONT_SANS_FACE,
    },
    card: {
      backgroundColor: "#FBF7EE",
      border: "3px solid #1B1712",
      boxShadow: "8px 8px 0 rgba(27,23,18,0.85)",
    },
    headerTitle: {
      fontFamily: FONT_DISPLAY_FACE,
      fontWeight: 800,
      color: "#1B1712",
    },
    headerSubtitle: {
      fontFamily: FONT_MONO_FACE,
      fontSize: "12px",
      color: "#8A7D6C",
    },
    socialButtonsBlockButton: {
      border: "2px solid #1B1712",
      backgroundColor: "#FBF7EE",
      color: "#1B1712",
      fontFamily: FONT_SANS_FACE,
      fontWeight: 500,
    },
    formFieldLabel: {
      fontFamily: FONT_MONO_FACE,
      fontSize: "11px",
      letterSpacing: "1px",
      color: "#8A7D6C",
    },
    formFieldInput: {
      border: "2px solid #1B1712",
      borderRadius: "8px",
      backgroundColor: "#FBF7EE",
      color: "#1B1712",
      fontFamily: FONT_MONO_FACE,
      fontSize: "13px",
    },
    formButtonPrimary: {
      backgroundColor: "#E5431E",
      border: "2.5px solid #1B1712",
      borderRadius: "8px 6px 8px 6px",
      boxShadow: "3px 3px 0 rgba(27,23,18,0.85)",
      fontFamily: FONT_SANS_FACE,
      fontWeight: 500,
      fontSize: "13px",
      textTransform: "none",
      "&:hover": {
        backgroundColor: "#E5431E",
      },
    },
    footerActionLink: {
      color: "#E5431E",
      fontFamily: FONT_MONO_FACE,
      fontSize: "12px",
    },
    identityPreviewEditButton: {
      color: "#E5431E",
    },
    dividerLine: {
      backgroundColor: "#D8CCB4",
    },
    dividerText: {
      fontFamily: FONT_MONO_FACE,
      fontSize: "11px",
      color: "#8A7D6C",
    },
    userButtonAvatarBox: {
      width: 36,
      height: 36,
      border: "1.5px solid #1B1712",
      borderRadius: "8px 6px 8px 6px",
      backgroundColor: "#FBF7EE",
    },
    avatarBox: {
      width: 36,
      height: 36,
      border: "1.5px solid #1B1712",
      borderRadius: "8px 6px 8px 6px",
      backgroundColor: "#FBF7EE",
      color: "#1B1712",
    },
    userButtonBox: {
      flexDirection: "row-reverse",
    },
    userButtonTrigger: {
      "&:focus": {
        boxShadow: "none",
      },
      "&:hover": {
        opacity: 1,
      },
    },
    userButtonPopoverCard: {
      backgroundColor: "#FBF7EE",
      border: "2px solid #1B1712",
      borderRadius: "10px",
      boxShadow: "4px 4px 0 rgba(27,23,18,0.85)",
    },
    userButtonPopoverActionButton: {
      fontFamily: FONT_MONO_FACE,
      fontSize: "12px",
      color: "#1B1712",
    },
    userButtonPopoverActionButtonText: {
      fontFamily: FONT_MONO_FACE,
    },
    userButtonPopoverFooter: {
      display: "none",
    },
  },
} as const;
