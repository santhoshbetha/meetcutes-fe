import { cn } from '@/lib/utils';
import { Trash2, Upload, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { validateProfileImage } from '@/lib/imageValidation';
import {
  JPEG_QUALITY,
  MAX_OUTPUT_DIMENSION,
} from '@/lib/imageCompression';

const delay = ms => new Promise(res => setTimeout(res, ms));

/**
 * A reusable image uploader component with drag & drop, preview, and crop functionality
 */
export function ImageUploader({
  aspectRatio = 1,
  maxSize = 5 * 1024 * 1024, // 5MB
  acceptedFileTypes = ['image/jpeg', 'image/png', 'image/webp'],
  className,
  onImageCropped,
  onImageRemove,
  setReload,
  minimal = false, // New prop for minimal mode
}) {
  const [image, setImage] = useState(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef(null);

  // We're not using a drop library like react-dropzone, so this is handled manually with DOM events

  const handleFileSelect = file => {
    if (!file) return;

    setError(null);

    // Reject unsafe payloads before FileReader/canvas work begins. The same
    // validator runs again in Photos.handleImageCropped and image.service, so a
    // future upload path cannot silently bypass these guardrails.
    try {
      validateProfileImage(file, {
        maxSize,
        allowedTypes: acceptedFileTypes,
      });
    } catch (validationError) {
      setError(validationError.message);
      toast.error(validationError.message);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result);
      setIsCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const cropImage = useCallback(async () => {
    if (!image || !croppedAreaPixels) return;

    const canvas = document.createElement('canvas');
    const img = new Image();
    img.src = image;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Could not decode this image.'));
    });

    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    const sourceWidth = croppedAreaPixels.width * scaleX;
    const sourceHeight = croppedAreaPixels.height * scaleY;
    const outputScale = Math.min(
      1,
      MAX_OUTPUT_DIMENSION / Math.max(sourceWidth, sourceHeight),
    );
    const outputWidth = Math.max(1, Math.round(sourceWidth * outputScale));
    const outputHeight = Math.max(1, Math.round(sourceHeight * outputScale));

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setError('Canvas is not available in this browser.');
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      img,
      croppedAreaPixels.x * scaleX,
      croppedAreaPixels.y * scaleY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputWidth,
      outputHeight,
    );

    const encode = quality =>
      new Promise((resolve, reject) => {
        canvas.toBlob(
          blob => {
            if (blob) resolve(blob);
            else reject(new Error('Could not encode this image.'));
          },
          'image/jpeg',
          quality,
        );
      });

    try {
      let blob = await encode(JPEG_QUALITY);

      for (const quality of [0.75, 0.65, 0.55]) {
        if (blob.size <= maxSize) break;
        blob = await encode(quality);
      }

      if (blob.size > maxSize) {
        setError('Compressed image is still larger than 5MB.');
        return;
      }

      const previewUrl = URL.createObjectURL(blob);
      setPreviewImage(previewUrl);
      if (onImageCropped) {
        onImageCropped(blob);
      }
      setIsCropDialogOpen(false);
    } catch (encodeError) {
      setError(encodeError.message || 'Could not process this image.');
    }
  }, [image, croppedAreaPixels, onImageCropped, maxSize]);

  const clearImage = () => {
    setRemoving(true);
    //console.log('clearimage');
    if (onImageRemove) {
      //console.log('onImageRemove');
      onImageRemove();
    }
    setPreviewImage(null);
    setImage(null);
    setCroppedAreaPixels(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRemoving(false);
  };

  const handleDragOver = e => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = e => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = e => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = e => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {minimal ? (
        // Minimal version for photo grid slots
        <div 
          className="w-full h-full flex flex-col items-center justify-center cursor-pointer relative"
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={acceptedFileTypes.join(',')}
            onChange={e => handleFileSelect(e.target.files ? e.target.files[0] : null)}
          />
          <Upload className="h-8 w-8 text-gray-400 group-hover:text-blue-500 transition-colors duration-300" />
          <p className="text-xs text-gray-500 group-hover:text-blue-600 transition-colors duration-300 mt-2 text-center px-2">
            Click to upload
          </p>
          {error && <p className="mt-1 text-xs text-red-500 text-center">{error}</p>}
        </div>
      ) : (
        // Full version with Card wrapper
        <Card className="w-full relative">
          {removing && (
            <Spinner className="absolute top-[50%] left-[50%] z-50 cursor-pointer size-10 text-red-800" />
          )}
          {loading && (
            <Spinner className="absolute top-[50%] left-[50%] z-50 cursor-pointer size-10 text-green-700" />
          )}
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex gap-2">
                {previewImage && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="outline" onClick={clearImage}>
                          <Trash2 size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Clear image</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!previewImage ? (
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/20 transition-colors"
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  accept={acceptedFileTypes.join(',')}
                  onChange={e => handleFileSelect(e.target.files ? e.target.files[0] : null)}
                />
                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Drag and drop an image here or click to browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {`Accepted formats: ${acceptedFileTypes.map(type => type.replace('image/', '.')).join(', ')}`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {`Max size: ${maxSize / (1024 * 1024)}MB`}
                </p>
                {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden">
                <img
                  src={previewImage}
                  alt="Cropped preview"
                  className="w-full h-auto rounded-lg object-cover aspect-ratio-1/1"
                  style={{ aspectRatio: aspectRatio }}
                />
                <Button
                  className="absolute bottom-4 right-4"
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsCropDialogOpen(true);
                  }}
                >
                  Edit
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            {!previewImage ? (
              <p className="text-xs text-muted-foreground">Upload an image to preview and crop</p>
            ) : (
              <div className="flex">
                <Button
                  className="ms-auto"
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (setReload) {
                      setLoading(true);
                      delay(2000).then(() => {
                        setReload(true);
                        setLoading(false);
                      });
                    }
                  }}
                >
                  Submit
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>
      )}

      <Dialog open={isCropDialogOpen} onOpenChange={setIsCropDialogOpen} modal={false}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
          </DialogHeader>
          {image && (
            <>
              <div className="relative w-full h-80">
                <Cropper
                  image={image}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspectRatio}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
              <div className="flex items-center gap-4">
                <ZoomOut className="h-4 w-4" />
                <Slider
                  value={[zoom]}
                  min={1}
                  max={3}
                  step={0.1}
                  onValueChange={value => setZoom(value[0])}
                />
                <ZoomIn className="h-4 w-4" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCropDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={cropImage}>Apply</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
