"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2, Grid3X3 } from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import useEmblaCarousel from "embla-carousel-react";
import type { PropertyMedia } from "@prisma/client";

interface PropertyGalleryProps {
  media: PropertyMedia[];
  title: string;
}

export function PropertyGallery({ media, title }: PropertyGalleryProps) {
  const images = media.filter((m) => m.type === "IMAGE");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [currentIndex, setCurrentIndex] = useState(0);

  const scrollPrev = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollPrev();
      setCurrentIndex(emblaApi.selectedScrollSnap());
    }
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollNext();
      setCurrentIndex(emblaApi.selectedScrollSnap());
    }
  }, [emblaApi]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  if (images.length === 0) {
    return (
      <div className="aspect-video bg-muted rounded-2xl flex items-center justify-center">
        <span className="text-muted-foreground text-sm">No images available</span>
      </div>
    );
  }

  const lightboxSlides = images.map((img) => ({
    src: img.url,
    alt: img.altText || title,
    width: img.width || 1200,
    height: img.height || 800,
  }));

  return (
    <div className="space-y-3">
      {/* Main Carousel */}
      <div className="relative rounded-2xl overflow-hidden bg-muted group">
        <div className="embla" ref={emblaRef}>
          <div className="embla__container">
            {images.map((img, i) => (
              <div key={img.id} className="embla__slide relative">
                <div className="aspect-[16/9] lg:aspect-[2/1]">
                  <Image
                    src={img.url}
                    alt={img.altText || `${title} — Photo ${i + 1}`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 800px"
                    className="object-cover cursor-pointer"
                    priority={i === 0}
                    onClick={() => openLightbox(i)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={scrollPrev}
              aria-label="Previous image"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass-dark flex items-center justify-center text-cream-100 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/40"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={scrollNext}
              aria-label="Next image"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass-dark flex items-center justify-center text-cream-100 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/40"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Counter */}
        <div className="absolute bottom-4 left-4 glass-dark rounded-full px-3 py-1 text-cream-100 text-xs">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Expand button */}
        <button
          onClick={() => openLightbox(currentIndex)}
          aria-label="Open fullscreen gallery"
          className="absolute bottom-4 right-4 glass-dark rounded-xl px-3 py-2 text-cream-100 text-xs flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/40"
        >
          <Maximize2 size={13} />
          View All {images.length} Photos
        </button>
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => {
                emblaApi?.scrollTo(i);
                setCurrentIndex(i);
              }}
              aria-label={`View photo ${i + 1}`}
              className={`relative shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                currentIndex === i
                  ? "border-gold-500 opacity-100"
                  : "border-transparent opacity-60 hover:opacity-80"
              }`}
            >
              <Image
                src={img.url}
                alt={`Thumbnail ${i + 1}`}
                fill
                sizes="80px"
                className="object-cover"
                loading="lazy"
              />
            </button>
          ))}
          {images.length > 5 && (
            <button
              onClick={() => openLightbox(0)}
              className="shrink-0 w-20 h-14 rounded-lg bg-navy-900/80 flex flex-col items-center justify-center text-cream-100 border-2 border-transparent hover:border-gold-500 transition-all"
              aria-label="View all photos"
            >
              <Grid3X3 size={16} className="mb-0.5" />
              <span className="text-2xs">All {images.length}</span>
            </button>
          )}
        </div>
      )}

      {/* Lightbox */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={lightboxSlides}
        index={lightboxIndex}
        plugins={[Zoom, Fullscreen, Thumbnails]}
        styles={{
          container: { backgroundColor: "rgba(10, 22, 40, 0.97)" },
        }}
      />
    </div>
  );
}
