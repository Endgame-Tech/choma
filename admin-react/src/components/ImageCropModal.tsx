import React, { useState, useRef, useCallback } from 'react'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import { XMarkIcon } from '@heroicons/react/24/outline'
import 'react-image-crop/dist/ReactCrop.css'

interface ImageCropModalProps {
    isOpen: boolean
    onClose: () => void
    onCropComplete: (croppedImageFile: File) => void
    imageFile: File
    aspectRatio?: number // Default will be 1080/1350 = 0.8
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
    isOpen,
    onClose,
    onCropComplete,
    imageFile,
    aspectRatio = 1080 / 1350 // 0.8 aspect ratio for 1080(width) x 1350(height)
}) => {
    const [crop, setCrop] = useState<Crop>()
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
    const [imageSrc, setImageSrc] = useState<string>('')
    const imgRef = useRef<HTMLImageElement>(null)
    const [processing, setProcessing] = useState(false)

    // Load image when modal opens
    React.useEffect(() => {
        if (isOpen && imageFile) {
            const reader = new FileReader()
            reader.onload = () => {
                setImageSrc(reader.result as string)
            }
            reader.readAsDataURL(imageFile)
        }
    }, [isOpen, imageFile])

    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget

        console.log('🖼️ Image loaded:', { width, height, aspectRatio })
        console.log('🔢 Target dimensions: 1080×1350 (width×height)')
        console.log('📐 Calculated aspect ratio:', aspectRatio, '(should be 0.8)')

        // Create initial crop centered and covering most of the image
        // For portrait aspect ratio (0.8), we want height to be larger than width
        const initialCrop = centerCrop(
            makeAspectCrop(
                {
                    unit: '%',
                    width: 60, // Start with 60% width for portrait orientation (width < height)
                },
                aspectRatio,
                width,
                height
            ),
            width,
            height
        )

        console.log('✂️ Initial crop:', initialCrop)
        setCrop(initialCrop)
    }, [aspectRatio])

    const getCroppedImg = useCallback((
        image: HTMLImageElement,
        crop: PixelCrop
    ): Promise<File> => {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')

            if (!ctx) {
                reject(new Error('No 2d context'))
                return
            }

            console.log('🎨 Creating cropped image:')
            console.log('  📏 Crop dimensions:', crop)
            console.log('  🖼️ Image natural size:', image.naturalWidth, '×', image.naturalHeight)
            console.log('  📐 Crop aspect ratio:', crop.width / crop.height)
            console.log('  🎯 Target canvas: 1080×1350 (aspect ratio:', 1080/1350, ')')

            // Set canvas size to target dimensions (1080x1350)
            canvas.width = 1080
            canvas.height = 1350

            // Calculate the scale factors
            const scaleX = image.naturalWidth / image.width
            const scaleY = image.naturalHeight / image.height

            console.log('  🔍 Scale factors:', { scaleX, scaleY })
            
            const sourceX = crop.x * scaleX
            const sourceY = crop.y * scaleY
            const sourceWidth = crop.width * scaleX
            const sourceHeight = crop.height * scaleY
            
            console.log('  ✂️ Source crop area:', { sourceX, sourceY, sourceWidth, sourceHeight })
            console.log('  🎯 Target area: 0,0 → 1080×1350')

            // Draw the cropped image scaled to target size
            ctx.drawImage(
                image,
                sourceX,
                sourceY,
                sourceWidth,
                sourceHeight,
                0,
                0,
                1080,
                1350
            )

            // Convert canvas to blob
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Canvas is empty'))
                        return
                    }

                    const file = new File([blob], imageFile.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    })

                    resolve(file)
                },
                'image/jpeg',
                0.9 // High quality for cropped image
            )
        })
    }, [imageFile.name])

    const handleCropComplete = async () => {
        if (!completedCrop || !imgRef.current) return

        setProcessing(true)
        try {
            const croppedImageFile = await getCroppedImg(imgRef.current, completedCrop)
            onCropComplete(croppedImageFile)
            onClose()
        } catch (error) {
            console.error('Error cropping image:', error)
        } finally {
            setProcessing(false)
        }
    }

    const handleSkipCrop = () => {
        onCropComplete(imageFile) // Use original file without cropping
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Crop Image</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Adjust the crop area to fit 1080×1350 dimensions (width×height - portrait orientation)
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            title="Close crop modal"
                            className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
                            disabled={processing}
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Crop Area */}
                <div className="flex-1 p-6 overflow-auto">
                    {imageSrc && (
                        <div className="w-full h-full min-h-0 flex items-center justify-center">
                            <ReactCrop
                                crop={crop}
                                onChange={(_, percentCrop) => setCrop(percentCrop)}
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={aspectRatio}
                                minWidth={80}
                                minHeight={100}
                                className="max-w-full max-h-full"
                            >
                                <img
                                    ref={imgRef}
                                    alt="Crop preview"
                                    src={imageSrc}
                                    onLoad={onImageLoad}
                                    style={{
                                        maxWidth: '90%',
                                        maxHeight: '70vh',
                                        width: 'auto',
                                        height: 'auto',
                                        objectFit: 'contain',
                                        display: 'block'
                                    }}
                                />
                            </ReactCrop>
                        </div>
                    )}
                </div>

                {/* Info Panel */}
                <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-t border-gray-200 dark:border-gray-600 flex-shrink-0">
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium mb-1">📐 Target Dimensions: 1080×1350 pixels (Portrait)</p>
                        <p>This aspect ratio (width:height = 4:5) is optimized for mobile displays and social media.</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex-shrink-0">
                    <div className="flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={handleSkipCrop}
                            disabled={processing}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-50"
                        >
                            Skip Cropping
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={processing}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleCropComplete}
                            disabled={processing || !completedCrop}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {processing && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            )}
                            {processing ? 'Processing...' : 'Crop & Use Image'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ImageCropModal