import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
  useDeleteProfileImageMutation,
  useReorderProfileImagesMutation,
  useUploadProfileImageMutation,
} from '@/hooks/useProfileQueries';
import { ImageUploader } from '@/components/ImageUploader';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from 'sonner';
import { describeApiError } from '@/lib/api';
import { validateProfileImage } from '@/lib/imageValidation';
import { Separator } from '@/components/ui/separator';
import { clearAppCaches } from '@/serviceWorkerRegistration';
import {
  Camera,
  AlertCircle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Plus, Grid3X3, Loader2, RotateCcw } from 'lucide-react';

const MAX_SLOTS = 10;
const MIN_VISIBLE_SLOTS = 3;

//https://www.sammeechward.com/uploading-images-express-and-react
//https://stackoverflow.com/questions/4109276/how-to-detect-input-type-file-change-for-the-same-file
//https://jsitor.com/XdnH239VS

function emptySlots() {
  return Array(MAX_SLOTS).fill(null);
}

function slotFilenames(profiledata) {
  return Array.from(
    { length: MAX_SLOTS },
    (_, index) => profiledata?.images?.[index] || '',
  );
}

export function Photos() {
  const { profiledata } = useAuth();
  const [images, setImages] = useState(emptySlots);
  const isOnline = useOnlineStatus();
  const [loadingImages] = useState(false);
  const [reload, setReload] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [uploadingSlots, setUploadingSlots] = useState(Array(MAX_SLOTS).fill(false));
  const [removingSlots, setRemovingSlots] = useState(Array(MAX_SLOTS).fill(false));
  const [removingEmptySlots, setRemovingEmptySlots] = useState(Array(MAX_SLOTS).fill(false));
  const [visibleSlots, setVisibleSlots] = useState(() => {
    const stored = localStorage.getItem('visibleSlots');
    return stored ? parseInt(stored, 10) : MIN_VISIBLE_SLOTS;
  });

  const uploadImage = useUploadProfileImageMutation();
  const deleteImage = useDeleteProfileImageMutation();
  const reorderImages = useReorderProfileImagesMutation();

  useEffect(() => {
    const filenames = profiledata?.images ?? [];
    const urls = profiledata?.image_urls ?? [];
    const nextImages = emptySlots();
    let maxIndexWithImage = -1;

    filenames.forEach((filename, index) => {
      if (filename && urls[index] && index < MAX_SLOTS) {
        nextImages[index] = { uri: urls[index] };
        maxIndexWithImage = Math.max(maxIndexWithImage, index);
      }
    });

    setImages(nextImages);
    setReload(false);

    const requiredSlots = Math.max(MIN_VISIBLE_SLOTS, maxIndexWithImage + 1);

    setVisibleSlots((previous) => {
      if (previous >= requiredSlots) return previous;

      localStorage.setItem('visibleSlots', requiredSlots.toString());
      return requiredSlots;
    });
  }, [isOnline, reload, profiledata?.images, profiledata?.image_urls]);

  const setSlotBusy = (setter, imageIndex, busy) => {
    setter((previous) => {
      const next = [...previous];
      next[imageIndex] = busy;
      return next;
    });
  };

  const handleImageCropped = async (blob, imageIndex) => {
    const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });

    // Intercept the generated file before the mutation/spinner starts. A
    // rejected file must not enter the upload execution loop at all.
    try {
      validateProfileImage(file);
    } catch (validationError) {
      toast.error(validationError.message);
      return;
    }

    setSlotBusy(setUploadingSlots, imageIndex, true);

    try {
      await uploadImage.mutateAsync({ file, slot: imageIndex });

      if (imageIndex >= visibleSlots) {
        const newVisibleSlots = Math.min(imageIndex + 1, MAX_SLOTS);
        setVisibleSlots(newVisibleSlots);
        localStorage.setItem('visibleSlots', newVisibleSlots.toString());
      }

      toast.success('Photo uploaded');
    } catch (error) {
      toast.error(describeApiError(error, 'Could not upload photo. Please try again.'));
    } finally {
      setSlotBusy(setUploadingSlots, imageIndex, false);
    }
  };

  const handleImageRemove = async (imageIndex) => {
    setSlotBusy(setRemovingSlots, imageIndex, true);

    try {
      await deleteImage.mutateAsync(imageIndex);
      toast.success('Photo removed');
    } catch (error) {
      toast.error(describeApiError(error, 'Could not remove photo. Please try again.'));
    } finally {
      setSlotBusy(setRemovingSlots, imageIndex, false);
    }
  };

  const handleAddMoreSlots = async () => {
    // Add 1 more slot, but don't exceed 10 total
    const newVisibleSlots = Math.min(visibleSlots + 1, MAX_SLOTS);
    setVisibleSlots(newVisibleSlots);
    localStorage.setItem('visibleSlots', newVisibleSlots.toString());
  };

  const handleRemoveEmptySlot = async (slotIndex) => {
    setSlotBusy(setRemovingEmptySlots, slotIndex, true);

    try {
      // Shift the remaining photos left so the gap closes.
      const shifted = slotFilenames(profiledata);
      for (let i = slotIndex; i < MAX_SLOTS - 1; i++) {
        shifted[i] = shifted[i + 1];
      }
      shifted[MAX_SLOTS - 1] = '';

      await reorderImages.mutateAsync(shifted);

      const newVisibleSlots = Math.max(visibleSlots - 1, MIN_VISIBLE_SLOTS);
      setVisibleSlots(newVisibleSlots);
      localStorage.setItem('visibleSlots', newVisibleSlots.toString());
    } catch (error) {
      toast.error(describeApiError(error, 'Failed to remove empty slot. Please try again.'));
    } finally {
      setSlotBusy(setRemovingEmptySlots, slotIndex, false);
    }
  };

  const getDisplayedSlots = () => {
    // Always show exactly visibleSlots number of slots
    return visibleSlots;
  };

  const handleClearPhotoCache = async () => {
    setClearingCache(true);

    try {
      await clearAppCaches();
      toast.success('Photo cache cleared. Refreshing images...');
      setReload(prev => !prev);
      setClearingCache(false);
    } catch (error) {
      toast.error(error?.message || 'Failed to clear cached photos');
      setClearingCache(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-muted/20 to-background">
      {loadingImages && (
        <Spinner
          className="top-[50%] left-[50%] z-50 absolute"
          size="medium"
          withText={true}
          text="Loading photos..."
        />
      )}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card className="bg-background rounded-2xl shadow-xl border border-border overflow-hidden">
          <CardHeader className="bg-linear-to-r from-primary/10 via-primary/5 to-primary/10 px-6 py-8 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Camera className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl text-primary">Photos</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Upload and manage your profile photos</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-8">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Your Profile Photos</h3>
                <p className="text-sm text-muted-foreground">
                  Upload photos to showcase your personality and interests. Start with 3 default slots and add more as needed.
                </p>
                <div className="mt-4 flex justify-center">
                  <Button
                    onClick={handleClearPhotoCache}
                    variant="outline"
                    disabled={clearingCache}
                    className="rounded-xl"
                  >
                    {clearingCache ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-2 h-4 w-4" />
                    )}
                    Clear Photo Cache
                  </Button>
                </div>
              </div>

            {/* Photo Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 mb-6 place-items-center">
              {images.slice(0, getDisplayedSlots()).map((image, index) => (
                <div key={index} className="relative group w-full max-w-64 sm:max-w-48">
                  {/* Photo Number Badge */}
                  <div className="absolute -top-2 -left-2 z-10">
                    <Badge
                      variant={image ? "default" : "secondary"}
                      className={`text-xs font-bold ${
                        image
                          ? 'bg-green-500 hover:bg-green-600 text-white'
                          : 'bg-gray-400 text-white'
                      }`}
                    >
                      {index + 1}
                    </Badge>
                  </div>

                  {/* Image Container */}
                  <div className="aspect-square rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-2 border-gray-100 hover:border-blue-300 w-full">
                    {image ? (
                      <div className="w-full h-full relative">
                        <img
                          src={image.uri}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover rounded-xl"
                        />
                        <Button
                          onClick={() => handleImageRemove(index)}
                          className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          variant="destructive"
                          size="sm"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        {removingSlots[index] && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-full bg-linear-to-br from-gray-700 to-gray-800 flex items-center justify-center group-hover:from-gray-600 group-hover:to-gray-700 transition-all duration-300 rounded-xl overflow-hidden relative">
                        <ImageUploader
                          onImageCropped={(blob) => handleImageCropped(blob, index)}
                          setReload={setReload}
                          minimal={true}
                          className="w-full h-full"
                        />
                        {uploadingSlots[index] && (
                          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                          </div>
                        )}
                        {removingEmptySlots[index] && (
                          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
                            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Remove Empty Slot Button */}
                  {!image && visibleSlots > 3 && index >= 3 && (
                    <div className="absolute -top-2 -right-2 z-20">
                      <Button
                        onClick={() => handleRemoveEmptySlot(index)}
                        variant="destructive"
                        size="sm"
                        className="h-6 w-6 p-0 rounded-full bg-red-500 hover:bg-red-600 border-2 border-white shadow-lg"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add More Photos Button */}
            {visibleSlots < 10 && (
              <div className="flex justify-center mb-8">
                <Button
                  onClick={handleAddMoreSlots}
                  variant="outline"
                  size="lg"
                  className="bg-gray-800 hover:bg-gray-700 border-2 border-gray-600 hover:border-gray-500 text-gray-200 hover:text-white font-medium px-8 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add New Photo Slot
                  <Grid3X3 className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}


              <Separator className="my-8" />

              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-foreground">Photo Tips</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Use clear, high-quality photos</li>
                      <li>• Show your face clearly in your profile photo</li>
                      <li>• Include photos that represent your interests and personality</li>
                      <li>• Avoid group photos as your primary image</li>
                      <li>• Add more photo slots as needed (up to 10 total)</li>
                      <li>• Remove empty extra slots to keep your profile organized</li>
                      <li>• Use Clear Photo Cache if an updated image still looks stale after login</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Photos;
