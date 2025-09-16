import React, { useState, useRef } from 'react'
import { uploadFile } from '../services/api'
import ImageCropModal from './ImageCropModal'

interface ImageUploadProps {
  currentImageUrl?: string
  onImageUpload: (imageUrl: string) => void
  className?: string
  accept?: string
  maxSizeMB?: number
  disabled?: boolean
  label?: string
  uploadEndpoint?: string  // New prop for different upload endpoints
  enableCropping?: boolean // New prop to enable/disable cropping
  cropAspectRatio?: number // Custom aspect ratio for cropping
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImageUrl,
  onImageUpload,
  className = '',
  accept = 'image/*',
  maxSizeMB = 5,
  disabled = false,
  label = 'Upload Image',
  uploadEndpoint = '/upload/banner-image',  // Default to banner endpoint
  enableCropping = true, // Enable cropping by default
  cropAspectRatio = 1080 / 1350 // Default to 1080x1350 aspect ratio
}) => {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxWidth) {
            width = (width * maxWidth) / height
            height = maxWidth
          }
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              resolve(compressedFile)
            } else {
              resolve(file) // Fallback to original file
            }
          },
          'image/jpeg',
          quality
        )
      }

      img.onerror = () => resolve(file) // Fallback to original file
      img.src = URL.createObjectURL(file)
    })
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxSizeMB) {
      setError(`File size must be less than ${maxSizeMB}MB`)
      return
    }

    setError(null)

    // If cropping is enabled, show crop modal
    if (enableCropping) {
      setSelectedFile(file)
      setShowCropModal(true)
    } else {
      // Process file directly without cropping
      await processAndUploadFile(file)
    }
  }

  const processAndUploadFile = async (file: File) => {
    // Compress image before upload if it's large
    let fileToUpload = file
    const fileSizeMB = file.size / (1024 * 1024)

    if (fileSizeMB > 1) { // Compress files larger than 1MB
      try {
        // For cropped images, use higher max dimensions to preserve the 1080×1350 crop
        const maxDimension = enableCropping ? 1400 : 1200
        fileToUpload = await compressImage(file, maxDimension, 0.8)
        const compressionRatio = ((file.size - fileToUpload.size) / file.size * 100).toFixed(1)
        setCompressionInfo(`Compressed by ${compressionRatio}% (${(file.size / 1024 / 1024).toFixed(1)}MB → ${(fileToUpload.size / 1024 / 1024).toFixed(1)}MB)`)
        console.log(`📦 Image compressed: ${file.size} → ${fileToUpload.size} bytes`)
      } catch (error) {
        console.warn('Image compression failed, using original file:', error)
        setCompressionInfo(null)
      }
    } else {
      setCompressionInfo(null)
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(fileToUpload)

    // Upload file
    await handleUpload(fileToUpload)
  }

  const handleCropComplete = async (croppedFile: File) => {
    setShowCropModal(false)
    setSelectedFile(null)
    await processAndUploadFile(croppedFile)
  }

  const handleCropCancel = () => {
    setShowCropModal(false)
    setSelectedFile(null)
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUpload = async (file: File) => {
    try {
      setUploading(true)
      setError(null)

      const formData = new FormData()
      formData.append('image', file)

      const response = await uploadFile(uploadEndpoint, formData)

      if (response.success) {
        onImageUpload(response.imageUrl || '')
        setPreviewUrl(response.imageUrl || '')
      } else {
        throw new Error(response.message || 'Upload failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setPreviewUrl(currentImageUrl || null)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreviewUrl(null)
    setCompressionInfo(null)
    onImageUpload('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Upload Area */}
      <div
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
          ${disabled || uploading
            ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 cursor-not-allowed'
            : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-700'
          }
          ${error ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : ''}
        `}
      >
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-40 max-w-full mx-auto rounded-lg object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-opacity rounded-lg flex items-center justify-center">
              <div className="opacity-0 hover:opacity-100 transition-opacity">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8">
            {uploading ? (
              <div className="space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Uploading...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-indigo-600 dark:text-indigo-400">{label}</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    PNG, JPG, GIF up to {maxSizeMB}MB
                    {enableCropping && <span className="block">Images will be cropped to 1080×1350</span>}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compression Info */}
      {compressionInfo && (
        <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-2">
          📦 {compressionInfo}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-2">
          {error}
        </div>
      )}

      {/* Actions */}
      {previewUrl && !uploading && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            className="flex-1 bg-indigo-600 text-white text-sm px-3 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Change Image
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="bg-red-600 text-white text-sm px-3 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Remove
          </button>
        </div>
      )}

      {/* Image Crop Modal */}
      {selectedFile && (
        <ImageCropModal
          isOpen={showCropModal}
          onClose={handleCropCancel}
          onCropComplete={handleCropComplete}
          imageFile={selectedFile}
          aspectRatio={cropAspectRatio}
        />
      )}
    </div>
  )
}

export default ImageUpload