import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

const delay = ms => new Promise(res => setTimeout(res, ms));
/**
 * A reusable image Loader component.
 */
export function ImageLoader({ aspectRatio = 1, className, imgSrc, onImageRemove }) {
  const [removing, setRemoving] = useState(false);

  const removeImage = e => {
    e.preventDefault();
    e.stopPropagation();
    setRemoving(true);
    if (onImageRemove) {
      delay(3000).then(async () => {
        onImageRemove();
        setRemoving(false);
      });
    }
    //setImage(null);
  };

  return (
    <div className={cn('w-full', className)}>
      <Card className="w-full relative">
        {removing && (
          <Spinner className="absolute top-[50%] left-[50%] z-50 cursor-pointer size-10 text-red-800" />
        )}
        <CardHeader>
          <CardTitle className="flex items-center justify-between"></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative rounded-lg overflow-hidden">
            <img
              src={imgSrc.uri}
              alt="Cropped preview"
              className="w-full h-auto rounded-lg object-cover aspect-ratio-1/1"
              style={{ aspectRatio: aspectRatio }}
            />
            <Button
              className="absolute bottom-4 right-4"
              variant="destructive"
              onClick={e => removeImage(e)}
            >
              Remove
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
