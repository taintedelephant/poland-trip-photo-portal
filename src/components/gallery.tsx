"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { TrashIcon, Pencil1Icon, DownloadIcon } from "@radix-ui/react-icons"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"

type ImageType = {
  id: string
  url: string
  caption: string
}

export function Gallery() {
  const [images, setImages] = useState<ImageType[]>([])
  const [selectedImage, setSelectedImage] = useState<ImageType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedCaption, setEditedCaption] = useState("")

  useEffect(() => {
    fetchImages()
  }, [])

  useEffect(() => {
    // Listen for new image uploads
    const handleNewImage = (e: CustomEvent) => {
      setImages((prev) => [e.detail, ...prev])
    }

    window.addEventListener("newImageUploaded", handleNewImage as EventListener)

    return () => {
      window.removeEventListener("newImageUploaded", handleNewImage as EventListener)
    }
  }, [])

  const fetchImages = async () => {
    try {
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setImages(data)
    } catch (error) {
      console.error('Error fetching images:', error)
      alert('Failed to fetch images. Please refresh the page.')
    } finally {
      setIsLoading(false)
    }
  }

  const openLightbox = (image: ImageType) => {
    setSelectedImage(image)
    document.body.style.overflow = "hidden"
  }

  const closeLightbox = () => {
    setSelectedImage(null)
    document.body.style.overflow = "auto"
  }

  const deleteImage = async (image: ImageType) => {
    if (!confirm('Are you sure you want to delete this image?')) return
    
    setIsDeleting(true)
    try {
      // First delete from database
      const { error: dbError } = await supabase
        .from('images')
        .delete()
        .eq('id', image.id)

      if (dbError) throw dbError

      // Then delete from storage
      // Extract the filename from the URL
      const urlParts = image.url.split('/')
      const filename = urlParts[urlParts.length - 1]

      const { error: storageError } = await supabase.storage
        .from('poland-photos')
        .remove([filename])

      if (storageError) {
        console.error('Storage deletion error:', storageError)
        // Continue even if storage deletion fails
      }

      // Update UI
      setImages(images.filter(img => img.id !== image.id))
      closeLightbox()
    } catch (error) {
      console.error('Error deleting image:', error)
      alert('Failed to delete image. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const saveCaption = async () => {
    if (!selectedImage) return
    try {
      const { error } = await supabase
        .from('images')
        .update({ caption: editedCaption })
        .eq('id', selectedImage.id)

      if (error) throw error

      // Update local state
      setImages(images.map(img => 
        img.id === selectedImage.id 
          ? { ...img, caption: editedCaption }
          : img
      ))
      setSelectedImage(prev => prev ? { ...prev, caption: editedCaption } : null)
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating caption:', error)
      alert('Failed to update caption. Please try again.')
    }
  }

  const startEditing = () => {
    if (selectedImage) {
      setEditedCaption(selectedImage.caption)
      setIsEditing(true)
    }
  }

  const downloadImage = async () => {
    if (!selectedImage) return
    try {
      const response = await fetch(selectedImage.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `poland-trip-${selectedImage.caption || 'photo'}.jpg`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading image:', error)
      alert('Failed to download image. Please try again.')
    }
  }

  const ImageComponent = ({ src, alt, className, isLightbox = false }: { src: string; alt: string; className?: string; isLightbox?: boolean }) => {
    // Check if the source is a base64 image
    const isBase64 = src.startsWith('data:image')
    
    if (isBase64) {
      return (
        <div className="relative w-full h-full">
          <img 
            src={src} 
            alt={alt} 
            className={`absolute w-full h-full ${isLightbox ? 'object-contain' : 'object-cover'}`} 
          />
        </div>
      )
    }
    
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image) => (
          <Card key={image.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div 
                className="relative aspect-[4/3] cursor-pointer group" 
                onClick={() => openLightbox(image)}
              >
                <ImageComponent
                  src={image.url}
                  alt={image.caption}
                  className="object-cover"
                />
              </div>
              {image.caption && (
                <div className="p-3 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
                  <p className="text-base font-semibold text-slate-600 dark:text-slate-400">{image.caption}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30" onClick={closeLightbox}>
          <div 
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute z-10 flex items-center gap-2 top-4 left-4">
              <Button
                variant="destructive"
                size="icon"
                className="bg-red-500/50 hover:bg-red-500/70"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteImage(selectedImage)
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <TrashIcon className="w-5 h-5" />
                )}
              </Button>
              <Button
                variant="outline"
                className="bg-black/50 hover:bg-black/70 text-white"
                onClick={downloadImage}
              >
                <DownloadIcon className="w-5 h-5 mr-2" />
                Save to Photos
              </Button>
            </div>
            <div className="relative" style={{ width: '80vw', height: '80vh' }}>
              <ImageComponent
                src={selectedImage.url}
                alt={selectedImage.caption}
                isLightbox={true}
                className="object-contain"
              />
            </div>
            {isEditing ? (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/50 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedCaption}
                    onChange={(e) => setEditedCaption(e.target.value)}
                    className="flex-1 px-3 py-2 bg-transparent border rounded-md text-white border-white/30 focus:outline-none focus:border-white"
                    placeholder="Enter new caption"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveCaption()
                      if (e.key === 'Escape') setIsEditing(false)
                    }}
                  />
                  <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button onClick={saveCaption}>Save</Button>
                </div>
              </div>
            ) : (
              selectedImage.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-4 text-center text-white bg-black/50 backdrop-blur-sm">
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-lg font-medium">{selectedImage.caption}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-white/10"
                      onClick={startEditing}
                    >
                      <Pencil1Icon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </>
  )
} 