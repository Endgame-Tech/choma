const { cloudinary } = require('../config/cloudinary');
const path = require('path');
require('dotenv').config();

async function uploadLogo() {
  try {
    // You can place your logo file in the backend/assets/ folder
    // Update this path to where your logo is located
    const logoPath = path.join(__dirname, '../assets/choma-logo.png');
    
    console.log('Uploading logo to Cloudinary...');
    console.log('Logo path:', logoPath);
    
    const result = await cloudinary.uploader.upload(logoPath, {
      folder: 'choma/branding',
      public_id: 'choma-logo',
      overwrite: true,
      width: 200,
      height: 100,
      crop: 'fit',
      quality: 'auto',
      format: 'auto'
    });

    console.log('✅ Logo uploaded successfully!');
    console.log('📷 Image URL:', result.secure_url);
    console.log('🔗 Public ID:', result.public_id);
    
    // Update the environment variable suggestion
    console.log('\n📝 Add this to your .env file:');
    console.log(`CHOMA_LOGO_URL=${result.secure_url}`);
    
    return result;
  } catch (error) {
    console.error('❌ Error uploading logo:', error);
    
    if (error.code === 'ENOENT') {
      console.log('\n💡 Make sure to:');
      console.log('1. Create backend/assets/ folder');
      console.log('2. Place your logo file as backend/assets/choma-logo.png');
      console.log('3. Or update the logoPath in this script');
    }
  }
}

// Run the upload
uploadLogo();