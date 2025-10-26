// components/SafeImage.tsx
"use client";

import NextImage, { ImageProps } from "next/image";
import React from "react";

/**
 * SafeImage tries to render via next/image. If the hostname isn't allowed
 * in next.config or an error occurs, it falls back to a plain <img>.
 * This avoids breaking logos/icons coming from diverse vendor CDNs.
 */
export default function SafeImage(props: ImageProps) {
  const [fallback, setFallback] = React.useState(false);

  if (fallback) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img
      src={String(props.src)}
      alt={props.alt || ""}
      width={Number(props.width) || undefined}
      height={Number(props.height) || undefined}
      className={props.className}
      loading="lazy"
      referrerPolicy="no-referrer"
    />;
  }

  return (
    <NextImage
      {...props}
      onError={() => setFallback(true)}
      // Ensure no layout shift
      sizes={props.sizes || "64px"}
    />
  );
}
