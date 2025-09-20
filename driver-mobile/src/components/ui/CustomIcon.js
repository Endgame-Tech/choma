import React from "react";
import { View } from "react-native";

// Import all your SVG icons
import ActivityIcon from "../../../assets/images/icons/ui/activity.svg";
import ActivityFilledIcon from "../../../assets/images/icons/ui/activity-filled.svg";
import AddIcon from "../../../assets/images/icons/ui/add.svg";
import BiometricIcon from "../../../assets/images/icons/ui/biometric.svg";
import CalendarIcon from "../../../assets/images/icons/ui/calendar.svg";
import CalendarFilledIcon from "../../../assets/images/icons/ui/calendar-filled.svg";
import CartIcon from "../../../assets/images/icons/ui/cart.svg";
import CartFilledIcon from "../../../assets/images/icons/ui/cart-filled.svg";
import ChefIcon from "../../../assets/images/icons/ui/chef.svg";
import ChefFilledIcon from "../../../assets/images/icons/ui/chef-filled.svg";
import chevronForwardIcon from "../../../assets/images/icons/ui/chevron-forward.svg";
import chevronBackIcon from "../../../assets/images/icons/ui/chevron-back.svg";
import chevronDownIcon from "../../../assets/images/icons/ui/chevron-down.svg";
import chevronUpIcon from "../../../assets/images/icons/ui/chevron-up.svg";
import ClockIcon from "../../../assets/images/icons/ui/clock.svg";
import ClockFilledIcon from "../../../assets/images/icons/ui/clock-filled.svg";
import CloseIcon from "../../../assets/images/icons/ui/close.svg";
import notificationIcon from "../../../assets/images/icons/ui/notification.svg";
import notificationFilledIcon from "../../../assets/images/icons/ui/notification-filled.svg";
import DarkIcon from "../../../assets/images/icons/ui/dark.svg";
import DataIcon from "../../../assets/images/icons/ui/data.svg";
import DataFilledIcon from "../../../assets/images/icons/ui/data-filled.svg";
import DeliveryManIcon from "../../../assets/images/icons/ui/delivery-man.svg";
import DeliveryManFilledIcon from "../../../assets/images/icons/ui/delivery-man-filled.svg";
import DetailsIcon from "../../../assets/images/icons/ui/details.svg";
import DetailsFilledIcon from "../../../assets/images/icons/ui/details-filled.svg";
import DownloadIcon from "../../../assets/images/icons/ui/download.svg";
import DownloadFilledIcon from "../../../assets/images/icons/ui/download-filled.svg";
import EditIcon from "../../../assets/images/icons/ui/edit.svg";
import EditFilledIcon from "../../../assets/images/icons/ui/edit--filled.svg";
import EmailIcon from "../../../assets/images/icons/ui/email.svg";
import EmailFilledIcon from "../../../assets/images/icons/ui/email-filled.svg";
import FamilyIcon from "../../../assets/images/icons/ui/family.svg";
import FamilyFilledIcon from "../../../assets/images/icons/ui/family-filled.svg";
import FeedbackHandIcon from "../../../assets/images/icons/ui/rate.svg";
import FeedbackHandFilledIcon from "../../../assets/images/icons/ui/rate-filled.svg";
import FilterIcon from "../../../assets/images/icons/ui/filter.svg";
import FilterFilledIcon from "../../../assets/images/icons/ui/filter-filled.svg";
import FitnessFilledIcon from "../../../assets/images/icons/ui/fittness-filled.svg";
import FlameIcon from "../../../assets/images/icons/ui/flame.svg";
import FoodIcon from "../../../assets/images/icons/ui/food.svg";
import FoodFilledIcon from "../../../assets/images/icons/ui/food-filled.svg";
import GiftIcon from "../../../assets/images/icons/ui/gift.svg";
import GiftFilledIcon from "../../../assets/images/icons/ui/gift-filled.svg";
import HandWaveIcon from "../../../assets/images/icons/ui/hand-wave.svg";
import HandWaveFilledIcon from "../../../assets/images/icons/ui/hand-wave-filled.svg";
import HeartIcon from "../../../assets/images/icons/ui/heart.svg";
import HeartFilledIcon from "../../../assets/images/icons/ui/heart-filled.svg";
import HomeIcon from "../../../assets/images/icons/ui/home.svg";
import HomeFilledIcon from "../../../assets/images/icons/ui/home-filled.svg";
import FrequencyIcon from "../../../assets/images/icons/ui/frequency.svg";
import missionIcon from "../../../assets/images/icons/ui/mission.svg";
import missionFilledIcon from "../../../assets/images/icons/ui/mission-filled.svg";
import ListIcon from "../../../assets/images/icons/ui/list.svg";
import ListFilledIcon from "../../../assets/images/icons/ui/list-filled.svg";
import LocationIcon from "../../../assets/images/icons/ui/location.svg";
import LocationFilledIcon from "../../../assets/images/icons/ui/location-filled.svg";
import MassageIcon from "../../../assets/images/icons/ui/massage.svg";
import MassageFilledIcon from "../../../assets/images/icons/ui/massage-filled.svg";
import MedalIcon from "../../../assets/images/icons/ui/medal.svg";
import MoreIcon from "../../../assets/images/icons/ui/more.svg";
import MoreFilledIcon from "../../../assets/images/icons/ui/more-filled.svg";
import MuscleIcon from "../../../assets/images/icons/ui/muscle.svg";
import MuscleFilledIcon from "../../../assets/images/icons/ui/muscle-filled.svg";
import OverviewIcon from "../../../assets/images/icons/ui/overview.svg";
import OverviewFilledIcon from "../../../assets/images/icons/ui/overview-filled.svg";
import PauseIcon from "../../../assets/images/icons/ui/pause.svg";
import ProfileIcon from "../../../assets/images/icons/ui/profile.svg";
import ProfileFilledIcon from "../../../assets/images/icons/ui/profile-filled.svg";
import ReorderIcon from "../../../assets/images/icons/ui/reorder.svg";
import RemoveIcon from "../../../assets/images/icons/ui/remove.svg";
import SearchIcon from "../../../assets/images/icons/ui/search.svg";
import SearchFilledIcon from "../../../assets/images/icons/ui/search-filled.svg";
import SendIcon from "../../../assets/images/icons/ui/send.svg";
import SendFilledIcon from "../../../assets/images/icons/ui/send-filled.svg";
import SettingsIcon from "../../../assets/images/icons/ui/settings.svg";
import SettingsFilledIcon from "../../../assets/images/icons/ui/settings-filled.svg";
import ShareIcon from "../../../assets/images/icons/ui/share.svg";
import ShareFilledIcon from "../../../assets/images/icons/ui/share-filled.svg";
import ShieldIcon from "../../../assets/images/icons/ui/shield.svg";
import ShieldFilledIcon from "../../../assets/images/icons/ui/shield-filled.svg";
import SignOutIcon from "../../../assets/images/icons/ui/sign-out.svg";
import StarIcon from "../../../assets/images/icons/ui/star.svg";
import StarFilledIcon from "../../../assets/images/icons/ui/star-filled.svg";
import WalletIcon from "../../../assets/images/icons/ui/wallet.svg";
import WalletFilledIcon from "../../../assets/images/icons/ui/wallet-filled.svg";

// Icon mapping object
const iconMap = {
  activity: ActivityIcon,
  "activity-filled": ActivityFilledIcon,
  biometric: BiometricIcon,
  calendar: CalendarIcon,
  "calendar-filled": CalendarFilledIcon,
  "calendar-outline": CalendarIcon,
  cart: CartIcon,
  "cart-filled": CartFilledIcon,
  chef: ChefIcon,
  "chef-filled": ChefFilledIcon,
  "chevron-forward": chevronForwardIcon,
  "chevron-back": chevronBackIcon,
  "chevron-down": chevronDownIcon,
  "chevron-up": chevronUpIcon,
  clock: ClockIcon,
  "clock-filled": ClockFilledIcon,
  dark: DarkIcon,
  data: DataIcon,
  "data-filled": DataFilledIcon,
  "delivery-man": DeliveryManIcon,
  "delivery-man-filled": DeliveryManFilledIcon,
  details: DetailsIcon,
  "details-filled": DetailsFilledIcon,
  download: DownloadIcon,
  "download-filled": DownloadFilledIcon,
  edit: EditIcon,
  "edit-filled": EditFilledIcon,
  ellipsis: MoreIcon,
  "ellipsis-filled": MoreFilledIcon,
  email: EmailIcon,
  "email-filled": EmailFilledIcon,
  family: FamilyIcon,
  "family-filled": FamilyFilledIcon,
  "feedback-hand": FeedbackHandIcon,
  filter: FilterIcon,
  "filter-filled": FilterFilledIcon,
  fitness: FitnessFilledIcon,
  "fitness-filled": FitnessFilledIcon,
  flame: FlameIcon,
  food: FoodIcon,
  "food-filled": FoodFilledIcon,
  frequency: FrequencyIcon,
  "hand-wave": HandWaveIcon,
  "hand-wave-filled": HandWaveFilledIcon,
  gift: GiftIcon,
  "gift-filled": GiftFilledIcon,
  heart: HeartIcon,
  "heart-filled": HeartFilledIcon,
  home: HomeIcon,
  "home-filled": HomeFilledIcon,
  list: ListIcon,
  "list-filled": ListFilledIcon,
  location: LocationIcon,
  "location-filled": LocationFilledIcon,
  massage: MassageIcon,
  "massage-filled": MassageFilledIcon,
  medal: MedalIcon,
  mission: missionIcon,
  "mission-filled": missionFilledIcon,
  muscle: MuscleIcon,
  "muscle-filled": MuscleFilledIcon,
  notification: notificationIcon,
  "notification-filled": notificationFilledIcon,
  notifications: notificationIcon,
  "notifications-filled": notificationFilledIcon,
  overview: OverviewIcon,
  "overview-filled": OverviewFilledIcon,
  profile: ProfileIcon,
  "profile-filled": ProfileFilledIcon,
  reorder: ReorderIcon,
  search: SearchIcon,
  "search-filled": SearchFilledIcon,
  send: SendIcon,
  "send-filled": SendFilledIcon,
  settings: SettingsIcon,
  "settings-filled": SettingsFilledIcon,
  share: ShareIcon,
  "share-filled": ShareFilledIcon,
  shield: ShieldIcon,
  "sign-out": SignOutIcon,
  "shield-filled": ShieldFilledIcon,
  star: StarIcon,
  "star-filled": StarFilledIcon,
  wallet: WalletIcon,
  "wallet-filled": WalletFilledIcon,

  // Common icon name mappings for compatibility
  pause: PauseIcon,
  time: ClockIcon,
  "time-outline": ClockIcon,
  "restaurant-outline": FoodIcon,
  add: AddIcon,
  close: CloseIcon,
  remove: RemoveIcon,
  "information-circle": DetailsIcon,
  nutrition: FoodIcon,
  "close-circle": CloseIcon,
  "help-circle": DetailsIcon,

  // Alert-specific icon mappings
  "checkmark-circle": StarFilledIcon, // Success icon
  warning: notificationIcon, // Warning icon
  "alert-circle": notificationFilledIcon, // Alert icon
  error: CloseIcon, // Error icon
  info: DetailsIcon, // Info icon
  question: DetailsIcon, // Question icon
  success: StarFilledIcon, // Success icon alternative
  alert: ShieldIcon, // Alert icon alternative
  help: DetailsIcon, // Help icon
};

const CustomIcon = ({
  name,
  size = 24,
  color = "#000000",
  filled = false,
  style,
  ...props
}) => {
  // Determine which icon to use
  let iconName = name;

  // If filled prop is true and a filled version exists, use it
  if (filled && iconMap[`${name}-filled`]) {
    iconName = `${name}-filled`;
  }

  // Get the icon component
  const IconComponent = iconMap[iconName] || iconMap[name];

  if (!IconComponent) {
    return null;
  }

  return (
    <View
      style={[
        { width: size, height: size, backgroundColor: "transparent" },
        style,
      ]}
    >
      <IconComponent
        width="100%"
        height="100%"
        fill={color}
        color={color}
        {...props}
      />
    </View>
  );
};

export default CustomIcon;
