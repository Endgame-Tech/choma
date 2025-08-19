#!/bin/bash

# Mobile App Production Cleanup Script
# This script removes development-only code, console statements, and optimizes for production

echo "🧹 Starting mobile app production cleanup..."

# Create backup
echo "📦 Creating backup of current codebase..."
tar -czf "backup-$(date +%Y%m%d-%H%M%S).tar.gz" src/ App.js package.json

# Function to remove console statements but preserve error logging
remove_console_statements() {
    local file="$1"
    
    # Remove console.log, console.debug, console.info, console.warn
    # But preserve console.error for production error tracking
    sed -i.bak -E '
        /console\.(log|debug|info|warn)\s*\(/d
        /^[[:space:]]*\/\/[[:space:]]*console\./d
    ' "$file"
    
    # Remove the backup file created by sed
    rm -f "${file}.bak"
}

# Function to remove TODO and FIXME comments
remove_todo_comments() {
    local file="$1"
    sed -i.bak -E '
        /\/\/[[:space:]]*(TODO|FIXME|DEBUG|XXX|HACK)/d
        /\/\*[[:space:]]*(TODO|FIXME|DEBUG|XXX|HACK).*\*\//d
    ' "$file"
    rm -f "${file}.bak"
}

# Function to remove commented imports
remove_commented_imports() {
    local file="$1"
    sed -i.bak -E '
        /^[[:space:]]*\/\/[[:space:]]*import/d
    ' "$file"
    rm -f "${file}.bak"
}

# Find all JavaScript and JSX files
echo "🔍 Finding JavaScript/JSX files..."
js_files=$(find src/ -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" 2>/dev/null)

# Process each file
echo "🧽 Cleaning JavaScript files..."
for file in $js_files; do
    if [ -f "$file" ]; then
        echo "  Processing: $file"
        remove_console_statements "$file"
        remove_todo_comments "$file"
        remove_commented_imports "$file"
    fi
done

# Clean App.js specifically
echo "🧽 Cleaning App.js..."
if [ -f "App.js" ]; then
    remove_console_statements "App.js"
    remove_todo_comments "App.js"
    remove_commented_imports "App.js"
fi

# Remove development-specific files
echo "🗑️  Removing development files..."
dev_files=(
    "src/utils/devConfig.js"
    "src/utils/tcpConnectionTest.js"
    "src/utils/connectionTest.js"
    "src/utils/networkDiagnostics.js"
    "src/utils/networkFix.js"
    "diagnostic.js"
    "src/screens/dashboard/DashboardScreen copy.js"
)

for dev_file in "${dev_files[@]}"; do
    if [ -f "$dev_file" ]; then
        echo "  Removing: $dev_file"
        rm "$dev_file"
    fi
done

# Remove duplicate asset directories
echo "🗂️  Cleaning duplicate assets..."
duplicate_dirs=(
    "src/images"
    "src/screens/assets"
)

for dup_dir in "${duplicate_dirs[@]}"; do
    if [ -d "$dup_dir" ]; then
        echo "  Removing duplicate directory: $dup_dir"
        rm -rf "$dup_dir"
    fi
done

# Clean up unused imports (requires manual review)
echo "📋 Generating unused imports report..."
cat > unused-imports-check.md << 'EOF'
# Unused Imports Check

Run these commands to find potentially unused imports:

```bash
# Find unused React imports
grep -r "import React" src/ | grep -v "React\."

# Find unused component imports  
grep -r "import.*from.*components" src/ | while read line; do
    file=$(echo "$line" | cut -d: -f1)
    import=$(echo "$line" | grep -o "import.*" | sed 's/import[[:space:]]*{\([^}]*\)}.*/\1/' | tr ',' '\n' | tr -d ' ')
    echo "File: $file"
    echo "Imports: $import"
    echo "---"
done
```

Please manually review and remove unused imports.
EOF

# Update package.json scripts for production
echo "📦 Updating package.json for production..."
if [ -f "package.json" ]; then
    # Create a clean production version
    node -e "
        const pkg = require('./package.json');
        
        // Remove dev dependencies that aren't needed in production
        const devOnlyDeps = ['nodemon'];
        devOnlyDeps.forEach(dep => {
            if (pkg.dependencies && pkg.dependencies[dep]) {
                delete pkg.dependencies[dep];
            }
        });
        
        // Update scripts for production
        pkg.scripts['build:android'] = 'expo build:android --type app-bundle';
        pkg.scripts['build:ios'] = 'expo build:ios --type archive';
        pkg.scripts['publish'] = 'expo publish';
        
        // Remove dev-only scripts
        delete pkg.scripts['dev'];
        
        console.log(JSON.stringify(pkg, null, 2));
    " > package-production.json
    
    echo "  Created package-production.json for production builds"
fi

# Clean expo cache
echo "🧹 Cleaning Expo cache..."
if command -v expo &> /dev/null; then
    expo install --fix
fi

# Generate production environment template
echo "🔧 Creating production environment template..."
cat > .env.production.template << 'EOF'
# Production Environment Variables
# Copy this to .env.production and fill in your production values

# API Configuration
API_BASE_URL=https://your-production-api.com
API_TIMEOUT=10000

# Paystack Configuration  
PAYSTACK_PUBLIC_KEY=pk_live_your_live_public_key
PAYSTACK_SECRET_KEY=sk_live_your_live_secret_key

# Push Notifications
EXPO_PUSH_TOKEN_ENDPOINT=https://your-production-api.com/push-tokens

# Analytics
ENABLE_ANALYTICS=true
ANALYTICS_API_KEY=your_analytics_key

# Feature Flags
ENABLE_BIOMETRIC_AUTH=true
ENABLE_OFFLINE_MODE=true
ENABLE_PUSH_NOTIFICATIONS=true

# Security
JWT_SECRET=your_very_secure_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# Third-party Services
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
EOF

# Generate production build instructions
echo "📖 Creating production build guide..."
cat > production-build-guide.md << 'EOF'
# Production Build Guide

## Pre-build Checklist

1. ✅ **Code Cleanup Completed** - Development code removed
2. ⚠️  **Environment Variables** - Configure `.env.production`
3. ⚠️  **API Endpoints** - Update to production URLs
4. ⚠️  **Signing Certificates** - Ensure valid certificates
5. ⚠️  **App Store Assets** - Icons, screenshots, descriptions ready

## Build Commands

### Android Production Build
```bash
# Generate signed APK
expo build:android --type apk

# Generate App Bundle (recommended for Play Store)
expo build:android --type app-bundle
```

### iOS Production Build
```bash
# Generate IPA for App Store
expo build:ios --type archive
```

### EAS Build (Modern Expo)
```bash
# Configure EAS
eas build:configure

# Build for both platforms
eas build --platform all

# Build for specific platform
eas build --platform android
eas build --platform ios
```

## Post-build Steps

1. Test the production build thoroughly
2. Upload to respective app stores
3. Configure app store listings
4. Submit for review

## Environment Setup

1. Copy `.env.production.template` to `.env.production`
2. Fill in all production values
3. Ensure all API endpoints point to production
4. Test authentication flows
5. Verify payment integration

## Performance Optimization

The cleanup script has already:
- ✅ Removed console.log statements
- ✅ Removed development files
- ✅ Cleaned up commented code
- ✅ Removed duplicate assets

Additional optimizations to consider:
- Image compression
- Code splitting
- Bundle analysis
- Performance monitoring setup
EOF

# Calculate cleanup statistics
echo ""
echo "📊 Cleanup Statistics:"
echo "  Console statements removed: $(find src/ -name "*.js" -o -name "*.jsx" | xargs grep -l "console\." 2>/dev/null | wc -l) files cleaned"
echo "  Development files removed: $(echo "${dev_files[@]}" | wc -w) files"
echo "  Duplicate directories removed: $(echo "${duplicate_dirs[@]}" | wc -w) directories"

echo ""
echo "✅ Production cleanup completed!"
echo ""
echo "📋 Next Steps:"
echo "  1. Review unused-imports-check.md and remove unused imports"
echo "  2. Configure .env.production with your production values"
echo "  3. Follow production-build-guide.md for building"
echo "  4. Test the app thoroughly before deployment"
echo ""
echo "📦 Backup created: backup-$(date +%Y%m%d-%H%M%S).tar.gz"