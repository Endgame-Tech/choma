# Profile Management Troubleshooting Guide

This guide provides solutions for common issues related to user profile management in the choma app.

## Common Issues and Solutions

### Profile Picture Upload Issues

1. **Permission Denied**
   - **Issue**: Unable to access the device gallery
   - **Solution**: Go to your device settings > Apps > choma > Permissions and ensure Storage/Media access is enabled

2. **Image Won't Load**
   - **Issue**: Profile picture appears blank or shows an error icon
   - **Solution**: 
     - Try selecting a different image
     - Ensure the image is not corrupted
     - Check if your device has sufficient storage space

3. **Upload Timeout**
   - **Issue**: Image upload takes too long or times out
   - **Solution**: 
     - Check your internet connection
     - Try a smaller image size
     - Close other apps using network bandwidth

### Profile Update Issues

1. **Changes Not Saving**
   - **Issue**: Profile changes don't persist after saving
   - **Solution**:
     - Check your internet connection
     - Ensure all required fields are filled correctly
     - Try refreshing the profile page
     - Log out and log back in

2. **Validation Errors**
   - **Issue**: Red error messages appear when trying to save
   - **Solution**: 
     - Ensure your name is at least 3 characters long
     - Format phone numbers correctly (e.g., +234 8012345678)
     - Address should be between 5-200 characters
     - Allergies description should be under 200 characters

3. **Offline Mode Issues**
   - **Issue**: Can't update profile while offline
   - **Solution**:
     - Profile updates require an internet connection
     - Changes will be stored locally and synced when online again
     - Watch for the offline indicator (orange cloud icon)

## Dietary Preferences

1. **Can't Select Multiple Preferences**
   - **Issue**: Only one dietary preference seems to be active
   - **Solution**: Tap each preference you want to select. Multiple selections are allowed.

2. **Preferences Not Showing in Meal Recommendations**
   - **Issue**: Your dietary preferences aren't reflected in meal suggestions
   - **Solution**:
     - Ensure you've saved your profile after selecting preferences
     - Refresh the meal plans page
     - Some meal plans may not be available for all dietary preferences

## Account Management

1. **Can't Logout**
   - **Issue**: Logout button doesn't work or app freezes
   - **Solution**:
     - Wait a few moments as the logout process completes
     - Force close and restart the app if necessary
     - Check internet connection as logout needs to sync with the server

2. **Email Can't Be Changed**
   - **Issue**: No option to update email address
   - **Solution**: Email addresses cannot be changed directly. Please contact customer support.

## Advanced Troubleshooting

If you continue to experience issues:

1. **Clear App Cache**
   - Go to device settings > Apps > choma > Storage > Clear Cache

2. **Reinstall the App**
   - Uninstall and reinstall the app (note: this may remove saved offline data)

3. **Contact Support**
   - Email support@choma.ng with:
     - Your account email
     - Description of the issue
     - Screenshots of any error messages
     - Device model and OS version

## Developer Notes

Profile data structure:
```javascript
{
  fullName: String,       // Required, 3-50 chars
  email: String,          // Non-editable after account creation
  phone: String,          // Optional, format validation applied
  address: String,        // Optional, 5-200 chars
  city: String,           // Either 'Lagos' or 'Abuja'
  dietaryPreferences: [], // Array of dietary preference strings
  allergies: String       // Optional, 0-200 chars
}
```
