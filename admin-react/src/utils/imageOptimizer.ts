/**
 * Image optimization utilities for Cloudinary URLs
 */

export interface ImageOptimizationOptions {
  width?: number
  height?: number
  quality?: 'auto' | 'auto:low' | 'auto:good' | 'auto:best' | number
  format?: 'auto' | 'webp' | 'jpg' | 'png'
  crop?: 'fill' | 'fit' | 'limit' | 'scale' | 'crop'
  gravity?: 'auto' | 'center' | 'face' | 'faces'
}

/**
 * Generates an optimized Cloudinary URL
 */
export const getOptimizedImageUrl = (
  originalUrl: string, 
  options: ImageOptimizationOptions = {}
): string => {
  if (!originalUrl || !originalUrl.includes('cloudinary')) {
    return originalUrl
  }

  const {
    width,
    height,
    quality = 'auto:good',
    format = 'auto',
    crop = 'fill',
    gravity = 'auto'
  } = options

  try {
    // Extract the upload part and the image path
    const urlParts = originalUrl.split('/upload/')
    if (urlParts.length !== 2) return originalUrl

    const [baseUrl, imagePath] = urlParts
    
    // Build transformation string
    const transformations = []
    
    if (width || height) {
      let sizeTransform = ''
      if (width) sizeTransform += `w_${width}`
      if (height) sizeTransform += `${sizeTransform ? ',' : ''}h_${height}`
      if (crop) sizeTransform += `,c_${crop}`
      if (gravity && (crop === 'fill' || crop === 'crop')) {
        sizeTransform += `,g_${gravity}`
      }
      transformations.push(sizeTransform)
    }
    
    if (quality) {
      transformations.push(`q_${quality}`)
    }
    
    if (format) {
      transformations.push(`f_${format}`)
    }
    
    // Add progressive flag for better loading
    transformations.push('fl_progressive')
    
    const transformationString = transformations.join('/')
    
    return `${baseUrl}/upload/${transformationString}/${imagePath}`
  } catch (error) {
    console.warn('Failed to optimize image URL:', error)
    return originalUrl
  }
}

/**
 * Preset optimizations for different image types
 */
export const ImagePresets: Record<'thumbnail' | 'card' | 'banner' | 'hero' | 'profile', ImageOptimizationOptions> = {
  thumbnail: { width: 150, height: 150, crop: 'fill', gravity: 'center' },
  card: { width: 400, height: 300, crop: 'fill', gravity: 'center' },
  banner: { width: 1200, height: 400, crop: 'fill', gravity: 'center' },
  hero: { width: 1920, height: 800, crop: 'fill', gravity: 'center' },
  profile: { width: 200, height: 200, crop: 'fill', gravity: 'face' }
}

/**
 * Get optimized URL using preset
 */
export const getPresetImageUrl = (
  originalUrl: string, 
  preset: keyof typeof ImagePresets
): string => {
  return getOptimizedImageUrl(originalUrl, ImagePresets[preset])
}

/**
 * Get responsive image URLs for different screen sizes
 */
export const getResponsiveImageUrls = (originalUrl: string) => {
  return {
    xs: getOptimizedImageUrl(originalUrl, { width: 320, quality: 'auto:good' }),
    sm: getOptimizedImageUrl(originalUrl, { width: 640, quality: 'auto:good' }),
    md: getOptimizedImageUrl(originalUrl, { width: 768, quality: 'auto:good' }),
    lg: getOptimizedImageUrl(originalUrl, { width: 1024, quality: 'auto:good' }),
    xl: getOptimizedImageUrl(originalUrl, { width: 1280, quality: 'auto:good' }),
    original: originalUrl
  }
}